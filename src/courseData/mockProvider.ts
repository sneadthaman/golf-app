import { Course } from "../types";
import { createSimplePar72Course } from "../simulation/courseFixtures";
import { CourseProvider, CourseSearchResult } from "./types";

function createDefaultMockCourses(): Course[] {
  const base = createSimplePar72Course();
  const demoCourses = Array.from({ length: 15 }).map((_, idx) => ({
    ...base,
    id: `mock-demo-${idx + 1}`,
    name: `Demo Course ${idx + 1}`
  }));
  return [base, ...demoCourses];
}

export class MockCourseProvider implements CourseProvider {
  private readonly courses: Course[];

  constructor(courses?: Course[]) {
    this.courses = courses ?? createDefaultMockCourses();
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
