import { Course } from "../types";
import { createSimplePar72Course } from "../simulation/courseFixtures";
import { CourseProvider, CourseSearchResult } from "./types";

export class MockCourseProvider implements CourseProvider {
  private readonly courses: Course[];

  constructor(courses?: Course[]) {
    this.courses = courses ?? [createSimplePar72Course()];
  }

  async searchCourses(query: string): Promise<CourseSearchResult[]> {
    const normalized = query.trim().toLowerCase();
    return this.courses
      .filter((course) => course.name.toLowerCase().includes(normalized))
      .map((course) => ({ id: course.id, name: course.name }));
  }

  async getCourse(courseId: string): Promise<Course> {
    const found = this.courses.find((course) => course.id === courseId);
    if (!found) {
      throw new Error(`Course not found: ${courseId}`);
    }
    return found;
  }
}
