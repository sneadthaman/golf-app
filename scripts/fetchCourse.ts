import { CourseValidationError, GolfCourseApiProvider } from "../src";

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const apiKey = process.env.GOLFCOURSEAPI_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GOLFCOURSEAPI_KEY environment variable");
  }

  const provider = new GolfCourseApiProvider({ apiKey });
  const id = getArg("--id");
  const search = getArg("--search");

  if (!id && !search) {
    throw new Error("Provide --search \"course name\" or --id <courseId>");
  }

  let targetId = id;
  if (!targetId && search) {
    const results = await provider.searchCourses(search);
    if (!results.length) {
      throw new Error(`No courses found for search query: ${search}`);
    }
    console.log("Top search results:");
    for (const result of results.slice(0, 5)) {
      console.log(`- ${result.id}: ${result.name}`);
    }
    targetId = results[0].id;
    console.log(`\nUsing first match: ${targetId}`);
  }

  const course = await provider.getCourse(targetId!);
  console.log("\nNormalized course:");
  console.log(JSON.stringify(course, null, 2));
}

main().catch((error) => {
  if (error instanceof CourseValidationError) {
    console.error(error.message);
    for (const detail of error.details) {
      console.error(`- ${detail}`);
    }
    process.exit(1);
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
