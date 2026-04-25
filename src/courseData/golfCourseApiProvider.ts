import { Course } from "../types";
import { normalizeExternalCourse } from "./normalize";
import { CourseProvider, CourseSearchResult, ExternalCoursePayload } from "./types";

interface GolfCourseApiSearchResponse {
  courses?: Array<{
    id?: number;
    club_name?: string;
    course_name?: string;
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

function ensureOk(response: Response, context: string): void {
  if (!response.ok) {
    throw new Error(`GolfCourseAPI ${context} failed: ${response.status} ${response.statusText}`);
  }
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

  constructor(options: { apiKey: string; baseUrl?: string; fetchFn?: FetchFn }) {
    this.apiKey = options.apiKey.trim();
    this.baseUrl = options.baseUrl?.replace(/\/$/, "") || "https://api.golfcourseapi.com";
    this.fetchFn = options.fetchFn ?? fetch;
    if (!this.apiKey) {
      throw new Error("GolfCourseAPI key is required");
    }
  }

  async searchCourses(query: string): Promise<CourseSearchResult[]> {
    const endpoint = `${this.baseUrl}/v1/search?search_query=${encodeURIComponent(query)}`;
    const response = await this.fetchFn(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Key ${this.apiKey}`
      }
    });
    ensureOk(response, "search");
    const payload = (await response.json()) as GolfCourseApiSearchResponse;
    return (payload.courses ?? [])
      .filter((course) => course.id != null)
      .map((course) => ({
        id: String(course.id),
        name: displayName(course.club_name, course.course_name)
      }));
  }

  async getCourse(courseId: string): Promise<Course> {
    const endpoint = `${this.baseUrl}/v1/courses/${encodeURIComponent(courseId)}`;
    const response = await this.fetchFn(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Key ${this.apiKey}`
      }
    });
    ensureOk(response, "getCourse");
    const raw = (await response.json()) as GolfCourseApiCourseResponse | GolfCourseApiCourseEnvelope;
    const payload = "course" in raw && raw.course ? raw.course : (raw as GolfCourseApiCourseResponse);
    return normalizeExternalCourse(mapCoursePayload(payload));
  }
}
