import { Course } from "../types";

export interface CourseSearchResult {
  id: string;
  name: string;
  state?: string;
}

export interface CourseProvider {
  searchCourses(query: string): Promise<CourseSearchResult[]>;
  getCourse(courseId: string): Promise<Course>;
}

export interface ExternalCoursePayload {
  id?: string;
  name?: string;
  handicapMode?: "standard18" | "split9_replay";
  holes?: Array<{
    holeNumber?: number;
    par?: number;
    handicapIndex?: number;
    yardages?: Record<string, number>;
  }>;
  teeBoxes?: Array<{
    id?: string;
    name?: string;
    color?: string;
    courseRating?: number;
    slope?: number;
  }>;
  parTotal?: number;
}

export class CourseValidationError extends Error {
  public readonly details: string[];

  constructor(message: string, details: string[]) {
    super(message);
    this.name = "CourseValidationError";
    this.details = details;
  }
}
