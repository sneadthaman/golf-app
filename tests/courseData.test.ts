import { describe, expect, test } from "vitest";
import {
  ApiCourseProvider,
  CachedCourseProvider,
  CourseValidationError,
  InMemoryCourseCache,
  MockCourseProvider,
  normalizeExternalCourse
} from "../src";

function validExternalPayload() {
  return {
    id: "c1",
    name: "External Club",
    holes: Array.from({ length: 18 }).map((_, idx) => ({
      holeNumber: idx + 1,
      par: idx % 3 === 0 ? 5 : idx % 2 === 0 ? 3 : 4,
      handicapIndex: idx + 1,
      yardages: { white: 380 + idx * 5 }
    })),
    teeBoxes: [
      { id: "white", name: "White", color: "white", courseRating: 71.4, slope: 127 },
      { id: "blue", name: "Blue", color: "blue", courseRating: 73.2, slope: 133 }
    ]
  };
}

describe("course normalization", () => {
  test("normalizes valid external payload", () => {
    const course = normalizeExternalCourse(validExternalPayload());
    expect(course.id).toBe("c1");
    expect(course.holes).toHaveLength(18);
    expect(course.teeBoxes).toHaveLength(2);
    expect(course.parTotal).toBeGreaterThan(60);
  });

  test("throws validation error for invalid payload", () => {
    expect(() => normalizeExternalCourse({ id: "bad", name: "Bad", holes: [], teeBoxes: [] })).toThrowError(
      CourseValidationError
    );
  });

  test("accepts 9-hole payload with handicap indexes 1-9", () => {
    const course = normalizeExternalCourse({
      id: "nine-1",
      name: "Nine Hole Track",
      holes: Array.from({ length: 9 }).map((_, idx) => ({
        holeNumber: idx + 1,
        par: idx % 2 === 0 ? 4 : 3,
        handicapIndex: idx + 1,
        yardages: { white: 300 + idx * 10 }
      })),
      teeBoxes: [{ id: "white", name: "White", color: "white", courseRating: 35.6, slope: 120 }]
    });
    expect(course.holes).toHaveLength(9);
    expect(course.parTotal).toBeGreaterThan(25);
  });
});

describe("course providers", () => {
  test("mock provider supports search and get", async () => {
    const provider = new MockCourseProvider();
    const results = await provider.searchCourses("simple");
    expect(results.length).toBeGreaterThan(0);
    const course = await provider.getCourse(results[0].id);
    expect(course.parTotal).toBe(72);
  });

  test("cached provider reuses cached course", async () => {
    let getCalls = 0;
    const baseProvider = {
      async searchCourses() {
        return [{ id: "c1", name: "External Club" }];
      },
      async getCourse() {
        getCalls += 1;
        return normalizeExternalCourse(validExternalPayload());
      }
    };
    const provider = new CachedCourseProvider(baseProvider, new InMemoryCourseCache());
    await provider.getCourse("c1");
    await provider.getCourse("c1");
    expect(getCalls).toBe(1);
  });

  test("api provider maps search and normalizes course detail", async () => {
    const client = {
      async get(path: string) {
        if (path.startsWith("/courses/search")) {
          return [{ id: "c1", name: "External Club" }];
        }
        return validExternalPayload();
      }
    };
    const provider = new ApiCourseProvider(client);
    const results = await provider.searchCourses("external");
    expect(results).toEqual([{ id: "c1", name: "External Club" }]);
    const course = await provider.getCourse("c1");
    expect(course.id).toBe("c1");
    expect(course.holes).toHaveLength(18);
  });
});
