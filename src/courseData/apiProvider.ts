import { Course } from "../types";
import { normalizeExternalCourse } from "./normalize";
import { CourseProvider, CourseSearchResult, ExternalCoursePayload } from "./types";

export interface ApiClient {
  get(path: string): Promise<unknown>;
}

function mapSearchResults(payload: unknown): CourseSearchResult[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item): item is { id?: unknown; name?: unknown } => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      name: typeof item.name === "string" ? item.name : ""
    }))
    .filter((item) => item.id.length > 0 && item.name.length > 0);
}

export class ApiCourseProvider implements CourseProvider {
  constructor(private readonly client: ApiClient) {}

  async searchCourses(query: string): Promise<CourseSearchResult[]> {
    const encoded = encodeURIComponent(query);
    const payload = await this.client.get(`/courses/search?q=${encoded}`);
    return mapSearchResults(payload);
  }

  async getCourse(courseId: string): Promise<Course> {
    const payload = (await this.client.get(`/courses/${encodeURIComponent(courseId)}`)) as ExternalCoursePayload;
    return normalizeExternalCourse(payload);
  }
}
