import { Course } from "../types";
import { normalizeExternalCourse } from "./normalize";
import { toStateAbbreviation } from "./state";
import { CourseProvider, CourseSearchResult, ExternalCoursePayload } from "./types";

interface GolfCourseApiSearchResponse {
  courses?: Array<{
    id?: number;
    club_name?: string;
    course_name?: string;
    location?: {
      state?: string;
    };
  }>;
}

interface GolfCourseApiCourseResponse {
  id?: number;
  club_name?: string;
  course_name?: string;
  tees?: {
    male?: GolfCourseApiTee[];
    female?: GolfCourseApiTee[];
  };
}

interface GolfCourseApiCourseEnvelope {
  course?: GolfCourseApiCourseResponse;
}

interface GolfCourseApiTee {
  tee_name?: string;
  course_rating?: number;
  slope_rating?: number;
  par_total?: number;
  holes?: Array<{
    par?: number;
    yardage?: number;
    handicap?: number;
  }>;
}

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type SleepFn = (ms: number) => Promise<void>;

type RequestContext = "search" | "getCourse";

class GolfCourseApiRequestError extends Error {
  public readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "GolfCourseApiRequestError";
    this.retryable = retryable;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function displayName(clubName?: string, courseName?: string): string {
  const club = (clubName ?? "").trim();
  const course = (courseName ?? "").trim();
  if (!club && !course) return "Unknown Course";
  if (!club) return course;
  if (!course) return club;
  if (club.toLowerCase() === course.toLowerCase()) return club;
  return `${club} - ${course}`;
}

function mapCoursePayload(payload: GolfCourseApiCourseResponse): ExternalCoursePayload {
  const teeEntries: Array<{ key: string; tee: GolfCourseApiTee }> = [];
  for (const tee of payload.tees?.male ?? []) {
    teeEntries.push({ key: `male-${slugify(tee.tee_name ?? "unknown")}`, tee });
  }
  for (const tee of payload.tees?.female ?? []) {
    teeEntries.push({ key: `female-${slugify(tee.tee_name ?? "unknown")}`, tee });
  }

  const referenceTee =
    teeEntries.find((entry) => (entry.tee.holes?.length ?? 0) === 18)?.tee ?? teeEntries[0]?.tee;
  const referenceHoles = referenceTee?.holes ?? [];
  const isReplayNine =
    referenceHoles.length === 18 &&
    referenceHoles.slice(0, 9).every((hole, idx) => {
      const back = referenceHoles[idx + 9];
      if (!back) return false;
      return hole?.par === back.par && hole?.yardage === back.yardage;
    });
  const normalizedHoleCount = referenceHoles.length === 9 ? 9 : 18;
  const holes = Array.from({ length: normalizedHoleCount }).map((_, idx) => ({
    holeNumber: idx + 1,
    par: referenceHoles[idx]?.par ?? 4,
    handicapIndex:
      referenceHoles[idx]?.handicap ??
      (isReplayNine && normalizedHoleCount === 18 ? (idx % 9) + 1 : idx + 1),
    yardages: teeEntries.reduce<Record<string, number>>((acc, entry) => {
      const yardage = entry.tee.holes?.[idx]?.yardage;
      if (typeof yardage === "number" && yardage > 0) {
        acc[entry.key] = yardage;
      }
      return acc;
    }, {})
  }));

  const teeBoxes = teeEntries.map((entry) => ({
    id: entry.key,
    name: entry.tee.tee_name ?? entry.key,
    color: entry.tee.tee_name?.toLowerCase() ?? "unknown",
    courseRating: entry.tee.course_rating ?? 72,
    slope: entry.tee.slope_rating ?? 113
  }));

  return {
    id: String(payload.id ?? ""),
    name: displayName(payload.club_name, payload.course_name),
    holes,
    teeBoxes,
    parTotal: referenceTee?.par_total,
    handicapMode: isReplayNine ? "split9_replay" : "standard18"
  };
}

export class GolfCourseApiProvider implements CourseProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly sleepFn: SleepFn;

  constructor(options: {
    apiKey: string;
    baseUrl?: string;
    fetchFn?: FetchFn;
    timeoutMs?: number;
    maxRetries?: number;
    retryBaseDelayMs?: number;
    sleepFn?: SleepFn;
  }) {
    this.apiKey = options.apiKey.trim();
    this.baseUrl = options.baseUrl?.replace(/\/$/, "") || "https://api.golfcourseapi.com";
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 250;
    this.sleepFn = options.sleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    if (!this.apiKey) {
      throw new Error("GolfCourseAPI key is required");
    }
  }

  private formatContext(context: RequestContext): string {
    return context === "search" ? "searching courses" : "loading the selected course";
  }

  private backoffMs(attempt: number): number {
    return this.retryBaseDelayMs * 2 ** attempt;
  }

  private statusError(response: Response, context: RequestContext): GolfCourseApiRequestError {
    const scope = this.formatContext(context);
    if (response.status === 401 || response.status === 403) {
      return new GolfCourseApiRequestError(
        "GolfCourseAPI authentication failed. Verify your API key.",
        false
      );
    }
    if (response.status === 404) {
      return new GolfCourseApiRequestError("Course not found in GolfCourseAPI.", false);
    }
    if (response.status === 429) {
      return new GolfCourseApiRequestError(
        `GolfCourseAPI rate limit reached while ${scope}. Please try again shortly.`,
        true
      );
    }
    if (response.status === 408) {
      return new GolfCourseApiRequestError(
        `GolfCourseAPI timed out while ${scope}. Please retry.`,
        true
      );
    }
    if (response.status >= 500) {
      return new GolfCourseApiRequestError(
        `GolfCourseAPI server error (${response.status}) while ${scope}. Please retry.`,
        true
      );
    }
    return new GolfCourseApiRequestError(
      `GolfCourseAPI request failed (${response.status} ${response.statusText}) while ${scope}.`,
      false
    );
  }

  private normalizeTransportError(error: unknown, context: RequestContext): GolfCourseApiRequestError {
    if (error instanceof GolfCourseApiRequestError) {
      return error;
    }

    const scope = this.formatContext(context);
    if (error instanceof Error && error.name === "AbortError") {
      return new GolfCourseApiRequestError(`GolfCourseAPI timed out while ${scope}. Please retry.`, true);
    }
    if (error instanceof TypeError) {
      return new GolfCourseApiRequestError(
        `Network error while ${scope}. Check your connection and try again.`,
        true
      );
    }

    return new GolfCourseApiRequestError(
      `Unexpected error while ${scope}: ${error instanceof Error ? error.message : String(error)}.`,
      false
    );
  }

  private async getJson<T>(endpoint: string, context: RequestContext): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchFn(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Key ${this.apiKey}`
          },
          signal: controller.signal
        });

        if (!response.ok) {
          throw this.statusError(response, context);
        }

        return (await response.json()) as T;
      } catch (error) {
        const normalized = this.normalizeTransportError(error, context);
        if (normalized.retryable && attempt < this.maxRetries) {
          await this.sleepFn(this.backoffMs(attempt));
          continue;
        }
        throw normalized;
      } finally {
        clearTimeout(timeoutHandle);
      }
    }

    throw new GolfCourseApiRequestError("GolfCourseAPI request failed after retries.", false);
  }

  async searchCourses(query: string): Promise<CourseSearchResult[]> {
    const endpoint = `${this.baseUrl}/v1/search?search_query=${encodeURIComponent(query)}`;
    const payload = await this.getJson<GolfCourseApiSearchResponse>(endpoint, "search");
    return (payload.courses ?? [])
      .filter((course) => course.id != null)
      .map((course) => {
        const state = toStateAbbreviation(course.location?.state);
        return {
          id: String(course.id),
          name: displayName(course.club_name, course.course_name),
          ...(state ? { state } : {})
        };
      });
  }

  async getCourse(courseId: string): Promise<Course> {
    const endpoint = `${this.baseUrl}/v1/courses/${encodeURIComponent(courseId)}`;
    const raw = await this.getJson<GolfCourseApiCourseResponse | GolfCourseApiCourseEnvelope>(endpoint, "getCourse");
    const payload = "course" in raw && raw.course ? raw.course : (raw as GolfCourseApiCourseResponse);
    return normalizeExternalCourse(mapCoursePayload(payload));
  }
}
