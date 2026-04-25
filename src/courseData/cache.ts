import { Course } from "../types";

export interface CourseCache {
  get(courseId: string): Promise<Course | null>;
  set(course: Course): Promise<void>;
}

export class InMemoryCourseCache implements CourseCache {
  private readonly byId = new Map<string, Course>();

  async get(courseId: string): Promise<Course | null> {
    return this.byId.get(courseId) ?? null;
  }

  async set(course: Course): Promise<void> {
    this.byId.set(course.id, course);
  }
}
