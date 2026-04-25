import { describe, expect, test } from "vitest";
import { GolfCourseApiProvider } from "../src";

function okResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("GolfCourseApiProvider", () => {
  test("searchCourses uses auth header and maps display names", async () => {
    const calls: Array<{ input: string; auth?: string }> = [];
    const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        input: String(input),
        auth: (init?.headers as Record<string, string> | undefined)?.Authorization
      });
      return okResponse({
        courses: [{ id: 10, club_name: "Old Westbury Golf & Country Club", course_name: "Main Course" }]
      });
    };
    const provider = new GolfCourseApiProvider({ apiKey: "abc123", fetchFn });
    const results = await provider.searchCourses("old westbury");
    expect(calls[0].input).toContain("/v1/search?search_query=old%20westbury");
    expect(calls[0].auth).toBe("Key abc123");
    expect(results).toEqual([{ id: "10", name: "Old Westbury Golf & Country Club - Main Course" }]);
  });

  test("getCourse normalizes tees and holes into internal Course shape", async () => {
    const holes = Array.from({ length: 18 }).map((_, idx) => ({
      par: idx % 3 === 0 ? 5 : idx % 2 === 0 ? 3 : 4,
      yardage: 360 + idx * 9,
      handicap: idx + 1
    }));
    const fetchFn = async () =>
      okResponse({
        course: {
          id: 99,
          club_name: "Old Westbury Golf & Country Club",
          course_name: "Main Course",
          tees: {
            male: [{ tee_name: "Blue", course_rating: 73.8, slope_rating: 135, par_total: 72, holes }],
            female: [{ tee_name: "Red", course_rating: 71.2, slope_rating: 128, par_total: 72, holes }]
          }
        }
      });
    const provider = new GolfCourseApiProvider({ apiKey: "key", fetchFn });
    const course = await provider.getCourse("99");
    expect(course.id).toBe("99");
    expect(course.holes).toHaveLength(18);
    expect(course.teeBoxes).toHaveLength(2);
    expect(course.teeBoxes[0].courseRating).toBeGreaterThan(0);
    expect(course.holes[0].yardageByTeeBox?.["male-blue"]).toBeTypeOf("number");
    expect(course.handicapMode).toBe("standard18");
  });

  test("getCourse supports 9-hole responses", async () => {
    const holes = Array.from({ length: 9 }).map((_, idx) => ({
      par: idx % 2 === 0 ? 4 : 3,
      yardage: 310 + idx * 11,
      handicap: idx + 1
    }));
    const fetchFn = async () =>
      okResponse({
        course: {
          id: 6760,
          club_name: "Old Westbury Golf &Country Club",
          course_name: "Bluegrass",
          tees: {
            male: [{ tee_name: "Blue", course_rating: 36.2, slope_rating: 126, par_total: 32, holes }]
          }
        }
      });
    const provider = new GolfCourseApiProvider({ apiKey: "key", fetchFn });
    const course = await provider.getCourse("6760");
    expect(course.holes).toHaveLength(9);
    expect(course.parTotal).toBe(32);
  });

  test("getCourse marks repeated front/back patterns as split9_replay", async () => {
    const frontNine = Array.from({ length: 9 }).map((_, idx) => ({
      par: idx % 2 === 0 ? 4 : 3,
      yardage: 300 + idx * 15
    }));
    const fetchFn = async () =>
      okResponse({
        course: {
          id: 7316,
          club_name: "Old Westbury Golf &Country Club",
          course_name: "Bluegrass-Overlook",
          tees: {
            male: [
              {
                tee_name: "Blue",
                course_rating: 72.1,
                slope_rating: 133,
                par_total: 64,
                holes: [...frontNine, ...frontNine]
              }
            ]
          }
        }
      });
    const provider = new GolfCourseApiProvider({ apiKey: "key", fetchFn });
    const course = await provider.getCourse("7316");
    expect(course.handicapMode).toBe("split9_replay");
    expect(course.holes[0].handicapIndex).toBe(1);
    expect(course.holes[8].handicapIndex).toBe(9);
    expect(course.holes[9].handicapIndex).toBe(1);
    expect(course.holes[17].handicapIndex).toBe(9);
  });
});
