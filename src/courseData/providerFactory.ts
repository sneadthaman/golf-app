import { Course } from "../types";
import { CachedCourseProvider } from "./cachedProvider";
import { InMemoryCourseCache } from "./cache";
import { GolfCourseApiProvider } from "./golfCourseApiProvider";
import { MockCourseProvider } from "./mockProvider";
import { CourseProvider } from "./types";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface CourseProviderFactoryOptions {
  golfCourseApiKey?: string;
  golfCourseApiBaseUrl?: string;
  fetchFn?: FetchFn;
  fallbackCourses?: Course[];
}

export interface CourseProviderFactoryResult {
  provider: CourseProvider;
  source: "golfcourseapi" | "mock";
}

export function createCourseProvider(options: CourseProviderFactoryOptions = {}): CourseProviderFactoryResult {
  const apiKey = options.golfCourseApiKey?.trim();
  if (!apiKey) {
    return {
      provider: new MockCourseProvider(options.fallbackCourses),
      source: "mock"
    };
  }

  return {
    provider: new CachedCourseProvider(
      new GolfCourseApiProvider({
        apiKey,
        baseUrl: options.golfCourseApiBaseUrl,
        fetchFn: options.fetchFn
      }),
      new InMemoryCourseCache()
    ),
    source: "golfcourseapi"
  };
}
