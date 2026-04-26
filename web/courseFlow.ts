import { Course, CourseProvider, CourseSearchResult } from "../src";

export interface RecentCourse {
  id: string;
  name: string;
  state?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CourseFlowOptions {
  provider: CourseProvider;
  storage?: StorageLike;
  storageKey?: string;
  maxRecentCourses?: number;
}

export interface CourseSearchOutcome {
  ok: boolean;
  message: string;
  results: CourseSearchResult[];
}

export interface CourseLoadOutcome {
  ok: boolean;
  message: string;
  course?: Course;
}

const DEFAULT_STORAGE_KEY = "golf-app.recent-courses.v1";
const DEFAULT_MAX_RECENT_COURSES = 8;

export function formatCourseLabel(course: Pick<CourseSearchResult, "id" | "name" | "state">): string {
  return `${course.name} (${course.state ?? course.id})`;
}

export class CourseFlowController {
  private readonly provider: CourseProvider;
  private readonly storage?: StorageLike;
  private readonly storageKey: string;
  private readonly maxRecentCourses: number;
  private searchResults: CourseSearchResult[] = [];
  private recentCourses: RecentCourse[] = [];

  constructor(options: CourseFlowOptions) {
    this.provider = options.provider;
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.maxRecentCourses = options.maxRecentCourses ?? DEFAULT_MAX_RECENT_COURSES;
  }

  initialize(): void {
    this.recentCourses = this.readRecentCourses();
  }

  getSearchResults(): CourseSearchResult[] {
    return this.searchResults;
  }

  getRecentCourses(): RecentCourse[] {
    return this.recentCourses;
  }

  async searchCourses(query: string): Promise<CourseSearchOutcome> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      this.searchResults = [];
      return {
        ok: false,
        message: "Enter a course name to search.",
        results: []
      };
    }

    try {
      const results = await this.provider.searchCourses(trimmedQuery);
      this.searchResults = results;

      if (!results.length) {
        return {
          ok: false,
          message: `No courses found for "${trimmedQuery}".`,
          results
        };
      }

      return {
        ok: true,
        message: `Found ${results.length} course(s). Choose one and click Load Selected Course.`,
        results
      };
    } catch (error) {
      this.searchResults = [];
      return {
        ok: false,
        message: `Course search failed: ${error instanceof Error ? error.message : String(error)}`,
        results: []
      };
    }
  }

  async loadCourseFromSearch(courseId: string): Promise<CourseLoadOutcome> {
    if (!courseId) {
      return { ok: false, message: "Select a course result before loading." };
    }
    const selected = this.searchResults.find((result) => result.id === courseId);
    return this.loadCourseById(courseId, selected);
  }

  async loadCourseFromRecent(courseId: string): Promise<CourseLoadOutcome> {
    if (!courseId) {
      return { ok: false, message: "Select a recent course before loading." };
    }
    const selected = this.recentCourses.find((course) => course.id === courseId);
    return this.loadCourseById(courseId, selected);
  }

  clearRecentCourses(): void {
    this.recentCourses = [];
    this.persistRecentCourses();
  }

  private async loadCourseById(
    courseId: string,
    hint?: Pick<CourseSearchResult, "name" | "state">
  ): Promise<CourseLoadOutcome> {
    try {
      const course = await this.provider.getCourse(courseId);
      const name = hint?.name ?? course.name;
      this.addRecentCourse({
        id: course.id,
        name,
        ...(hint?.state ? { state: hint.state } : {})
      });
      return { ok: true, message: `Loaded ${name}.`, course };
    } catch (error) {
      return {
        ok: false,
        message: `Course load failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private addRecentCourse(course: RecentCourse): void {
    this.recentCourses = [course, ...this.recentCourses.filter((item) => item.id !== course.id)].slice(
      0,
      this.maxRecentCourses
    );
    this.persistRecentCourses();
  }

  private readRecentCourses(): RecentCourse[] {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item): item is { id?: unknown; name?: unknown; state?: unknown } => typeof item === "object" && item !== null)
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : "",
          name: typeof item.name === "string" ? item.name : "",
          state: typeof item.state === "string" ? item.state : undefined
        }))
        .filter((item) => item.id.length > 0 && item.name.length > 0)
        .slice(0, this.maxRecentCourses);
    } catch {
      return [];
    }
  }

  private persistRecentCourses(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.recentCourses));
    } catch {
      // Ignore storage write failures (private mode, quota, etc.)
    }
  }
}
