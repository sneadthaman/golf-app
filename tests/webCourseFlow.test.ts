import { describe, expect, test } from "vitest";
import { Course, createSimplePar72Course } from "../src";
import { CourseFlowController } from "../web/courseFlow";

class MemoryStorage {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function makeCourse(id: string, name: string): Course {
  const base = createSimplePar72Course();
  return { ...base, id, name };
}

describe("CourseFlowController integration", () => {
  test("search and load from search adds course to recent list", async () => {
    const storage = new MemoryStorage();
    const provider = {
      async searchCourses() {
        return [{ id: "6760", name: "Old Westbury - Bluegrass", state: "NY" }];
      },
      async getCourse(courseId: string) {
        return makeCourse(courseId, "Old Westbury - Bluegrass");
      }
    };

    const flow = new CourseFlowController({ provider, storage });
    flow.initialize();

    const search = await flow.searchCourses("old westbury");
    expect(search.ok).toBe(true);
    expect(flow.getSearchResults()).toHaveLength(1);

    const load = await flow.loadCourseFromSearch("6760");
    expect(load.ok).toBe(true);
    expect(load.course?.id).toBe("6760");
    expect(flow.getRecentCourses()).toEqual([{ id: "6760", name: "Old Westbury - Bluegrass", state: "NY" }]);
    expect(storage.getItem("golf-app.recent-courses.v1")).toContain("6760");
  });

  test("load from recent works after initialize from storage", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "golf-app.recent-courses.v1",
      JSON.stringify([{ id: "7316", name: "Old Westbury - Bluegrass/Overlook", state: "NY" }])
    );
    const provider = {
      async searchCourses() {
        return [];
      },
      async getCourse(courseId: string) {
        return makeCourse(courseId, "Old Westbury - Bluegrass/Overlook");
      }
    };

    const flow = new CourseFlowController({ provider, storage });
    flow.initialize();

    expect(flow.getRecentCourses()).toHaveLength(1);
    const load = await flow.loadCourseFromRecent("7316");
    expect(load.ok).toBe(true);
    expect(load.message).toContain("Loaded");
  });

  test("recent courses are deduped and capped", async () => {
    const storage = new MemoryStorage();
    const provider = {
      async searchCourses() {
        return [
          { id: "a", name: "Course A", state: "NY" },
          { id: "b", name: "Course B", state: "NJ" },
          { id: "c", name: "Course C", state: "CA" }
        ];
      },
      async getCourse(courseId: string) {
        return makeCourse(courseId, `Course ${courseId.toUpperCase()}`);
      }
    };

    const flow = new CourseFlowController({ provider, storage, maxRecentCourses: 2 });
    flow.initialize();
    await flow.searchCourses("course");
    await flow.loadCourseFromSearch("a");
    await flow.loadCourseFromSearch("b");
    await flow.loadCourseFromSearch("a");

    expect(flow.getRecentCourses()).toEqual([
      { id: "a", name: "Course A", state: "NY" },
      { id: "b", name: "Course B", state: "NJ" }
    ]);
  });

  test("clearRecentCourses clears persisted state", () => {
    const storage = new MemoryStorage();
    storage.setItem("golf-app.recent-courses.v1", JSON.stringify([{ id: "a", name: "Course A" }]));
    const provider = {
      async searchCourses() {
        return [];
      },
      async getCourse() {
        return makeCourse("a", "Course A");
      }
    };
    const flow = new CourseFlowController({ provider, storage });
    flow.initialize();
    expect(flow.getRecentCourses()).toHaveLength(1);

    flow.clearRecentCourses();

    expect(flow.getRecentCourses()).toHaveLength(0);
    expect(storage.getItem("golf-app.recent-courses.v1")).toBe("[]");
  });

  test("minimum search length is enforced before provider call", async () => {
    let searchCalls = 0;
    const provider = {
      async searchCourses() {
        searchCalls += 1;
        return [{ id: "a", name: "Course A", state: "NY" }];
      },
      async getCourse(courseId: string) {
        return makeCourse(courseId, "Course A");
      }
    };

    const flow = new CourseFlowController({ provider, minSearchChars: 4 });
    flow.initialize();
    const short = await flow.searchCourses("abc");
    expect(short.ok).toBe(false);
    expect(short.message).toContain("at least 4 characters");
    expect(searchCalls).toBe(0);

    const valid = await flow.searchCourses("abcd");
    expect(valid.ok).toBe(true);
    expect(searchCalls).toBe(1);
  });

  test("load more appends additional results until exhausted", async () => {
    const provider = {
      async searchCourses() {
        return Array.from({ length: 5 }).map((_, idx) => ({
          id: `c${idx + 1}`,
          name: `Course ${idx + 1}`,
          state: "NY"
        }));
      },
      async getCourse(courseId: string) {
        return makeCourse(courseId, `Course ${courseId}`);
      }
    };

    const flow = new CourseFlowController({ provider, searchPageSize: 2 });
    flow.initialize();

    const initial = await flow.searchCourses("course");
    expect(initial.ok).toBe(true);
    expect(initial.results).toHaveLength(2);
    expect(initial.hasMore).toBe(true);

    const more1 = flow.loadMoreSearchResults();
    expect(more1.ok).toBe(true);
    expect(more1.results).toHaveLength(4);
    expect(more1.hasMore).toBe(true);

    const more2 = flow.loadMoreSearchResults();
    expect(more2.ok).toBe(true);
    expect(more2.results).toHaveLength(5);
    expect(more2.hasMore).toBe(false);
  });

  test("load more without search returns a guard message", () => {
    const provider = {
      async searchCourses() {
        return [];
      },
      async getCourse(courseId: string) {
        return makeCourse(courseId, `Course ${courseId}`);
      }
    };
    const flow = new CourseFlowController({ provider });
    flow.initialize();
    const outcome = flow.loadMoreSearchResults();
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("Run a search");
  });
});
