import { Course } from "../types";
import { CourseCache } from "./cache";
import { CourseProvider, CourseSearchResult } from "./types";

export class CachedCourseProvider implements CourseProvider {
  constructor(private readonly provider: CourseProvider, private readonly cache: CourseCache) {}

  async searchCourses(query: string): Promise<CourseSearchResult[]> {
    return this.provider.searchCourses(query);
  }

  async getCourse(courseId: string): Promise<Course> {
    const cached = await this.cache.get(courseId);
    if (cached) return cached;
    const course = await this.provider.getCourse(courseId);
    await this.cache.set(course);
    return course;
  }
}
