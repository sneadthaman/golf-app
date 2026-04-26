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
  minSearchChars?: number;
  searchPageSize?: number;
}

export interface CourseSearchOutcome {
  ok: boolean;
  message: string;
  results: CourseSearchResult[];
  hasMore: boolean;
}

export interface CourseLoadOutcome {
  ok: boolean;
  message: string;
  course?: Course;
}

export interface CourseLoadMoreOutcome {
  ok: boolean;
  message: string;
  results: CourseSearchResult[];
  hasMore: boolean;
}

const DEFAULT_STORAGE_KEY = "golf-app.recent-courses.v1";
const DEFAULT_MAX_RECENT_COURSES = 8;
const DEFAULT_MIN_SEARCH_CHARS = 1;
const DEFAULT_SEARCH_PAGE_SIZE = 8;

export function formatCourseLabel(course: Pick<CourseSearchResult, "id" | "name" | "state">): string {
  return `${course.name} (${course.state ?? course.id})`;
}

export class CourseFlowController {
  private readonly provider: CourseProvider;
  private readonly storage?: StorageLike;
  private readonly storageKey: string;
  private readonly maxRecentCourses: number;
  private readonly minSearchChars: number;
  private readonly searchPageSize: number;
  private searchResults: CourseSearchResult[] = [];
  private recentCourses: RecentCourse[] = [];
  private currentSearchQuery = "";
  private allSearchResults: CourseSearchResult[] = [];
  private currentSearchOffset = 0;

  constructor(options: CourseFlowOptions) {
    this.provider = options.provider;
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.maxRecentCourses = options.maxRecentCourses ?? DEFAULT_MAX_RECENT_COURSES;
    this.minSearchChars = options.minSearchChars ?? DEFAULT_MIN_SEARCH_CHARS;
    this.searchPageSize = options.searchPageSize ?? DEFAULT_SEARCH_PAGE_SIZE;
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

  hasMoreSearchResults(): boolean {
    return this.currentSearchOffset < this.allSearchResults.length;
  }

  async searchCourses(query: string): Promise<CourseSearchOutcome> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      this.currentSearchQuery = "";
      this.allSearchResults = [];
      this.currentSearchOffset = 0;
      this.searchResults = [];
      return {
        ok: false,
        message: "Enter a course name to search.",
        results: [],
        hasMore: false
      };
    }
    if (trimmedQuery.length < this.minSearchChars) {
      this.currentSearchQuery = "";
      this.allSearchResults = [];
      this.currentSearchOffset = 0;
      this.searchResults = [];
      return {
        ok: false,
        message: `Enter at least ${this.minSearchChars} characters to search.`,
        results: [],
        hasMore: false
      };
    }

    try {
      const results = await this.provider.searchCourses(trimmedQuery);
      this.currentSearchQuery = trimmedQuery;
      this.allSearchResults = results;
      this.currentSearchOffset = Math.min(this.searchPageSize, results.length);
      this.searchResults = this.allSearchResults.slice(0, this.currentSearchOffset);

      if (!results.length) {
        return {
          ok: false,
          message: `No courses found for "${trimmedQuery}".`,
          results: this.searchResults,
          hasMore: false
        };
      }

      return {
        ok: true,
        message: this.hasMoreSearchResults()
          ? `Found ${results.length} course(s). Showing ${this.searchResults.length}. Tap Load More for more.`
          : `Found ${results.length} course(s). Choose one and click Load Selected Course.`,
        results: this.searchResults,
        hasMore: this.hasMoreSearchResults()
      };
    } catch (error) {
      this.currentSearchQuery = "";
      this.allSearchResults = [];
      this.currentSearchOffset = 0;
      this.searchResults = [];
      return {
        ok: false,
        message: `Course search failed: ${error instanceof Error ? error.message : String(error)}`,
        results: [],
        hasMore: false
      };
    }
  }

  loadMoreSearchResults(): CourseLoadMoreOutcome {
    if (!this.currentSearchQuery) {
      return {
        ok: false,
        message: "Run a search before loading more results.",
        results: this.searchResults,
        hasMore: false
      };
    }

    if (!this.hasMoreSearchResults()) {
      return {
        ok: false,
        message: "No more courses to load.",
        results: this.searchResults,
        hasMore: false
      };
    }

    this.currentSearchOffset = Math.min(this.currentSearchOffset + this.searchPageSize, this.allSearchResults.length);
    this.searchResults = this.allSearchResults.slice(0, this.currentSearchOffset);

    return {
      ok: true,
      message: this.hasMoreSearchResults()
        ? `Showing ${this.searchResults.length} of ${this.allSearchResults.length} courses.`
        : `Showing all ${this.allSearchResults.length} courses.`,
      results: this.searchResults,
      hasMore: this.hasMoreSearchResults()
    };
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
