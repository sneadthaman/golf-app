import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { GolfCourseApiProvider } from "../src";

type RawCourseEnvelope = {
  course?: {
    id?: number;
    club_name?: string;
    course_name?: string;
    location?: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    };
  };
};

const OLD_WESTBURY_IDS = ["6760", "6770", "6847", "7316", "7339", "7626"];

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function facilityRefFromClub(clubName: string): string {
  return clubName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchRawCourse(apiKey: string, courseId: string): Promise<RawCourseEnvelope> {
  const response = await fetch(`https://api.golfcourseapi.com/v1/courses/${courseId}`, {
    headers: { Authorization: `Key ${apiKey}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch raw course ${courseId}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as RawCourseEnvelope;
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = requiredEnv("GOLFCOURSEAPI_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });
  const provider = new GolfCourseApiProvider({ apiKey });

  let facilityId: string | null = null;
  let cachedFacility:
    | {
        clubName: string;
        location?: RawCourseEnvelope["course"]["location"];
      }
    | null = null;

  for (const providerCourseRef of OLD_WESTBURY_IDS) {
    const normalizedCourse = await provider.getCourse(providerCourseRef);

    if (!cachedFacility) {
      try {
        const rawEnvelope = await fetchRawCourse(apiKey, providerCourseRef);
        const rawCourse = rawEnvelope.course;
        if (rawCourse?.club_name) {
          cachedFacility = {
            clubName: rawCourse.club_name,
            location: rawCourse.location
          };
        }
      } catch (error) {
        const derivedClubName = normalizedCourse.name.split(" - ")[0]?.trim() || "Unknown Club";
        console.warn(
          `Raw facility fetch failed for ${providerCourseRef}, falling back to derived club name: ${derivedClubName}`
        );
        cachedFacility = { clubName: derivedClubName };
      }
    }

    const clubName = cachedFacility.clubName;
    const facilityRef = facilityRefFromClub(clubName);

    if (!facilityId) {
      const { data: facilityRows, error: facilityError } = await supabase
        .from("facilities")
        .upsert(
          {
            name: clubName,
            address: cachedFacility.location?.address ?? null,
            city: cachedFacility.location?.city ?? null,
            state: cachedFacility.location?.state ?? null,
            country: cachedFacility.location?.country ?? null,
            latitude: cachedFacility.location?.latitude ?? null,
            longitude: cachedFacility.location?.longitude ?? null,
            provider: "golfcourseapi",
            provider_facility_ref: facilityRef
          },
          { onConflict: "provider,provider_facility_ref" }
        )
        .select("id")
        .limit(1);
      if (facilityError) throw facilityError;
      facilityId = facilityRows?.[0]?.id ?? null;
      if (!facilityId) throw new Error("Failed to upsert facility row");
    }

    const sourceHash = crypto.createHash("sha256").update(JSON.stringify(normalizedCourse)).digest("hex");
    const { data: courseRows, error: courseError } = await supabase
      .from("courses")
      .upsert(
        {
          facility_id: facilityId,
          name: normalizedCourse.name,
          hole_count: normalizedCourse.holes.length,
          par_total: normalizedCourse.parTotal,
          handicap_mode: normalizedCourse.handicapMode ?? "standard18",
          provider: "golfcourseapi",
          provider_course_ref: providerCourseRef,
          fetched_at: new Date().toISOString(),
          source_hash: sourceHash
        },
        { onConflict: "provider,provider_course_ref" }
      )
      .select("id")
      .limit(1);
    if (courseError) throw courseError;
    const courseId = courseRows?.[0]?.id;
    if (!courseId) throw new Error(`Failed to upsert course ${providerCourseRef}`);

    const teeRows = normalizedCourse.teeBoxes.map((tee) => ({
      course_id: courseId,
      code: tee.id,
      name: tee.name,
      color: tee.color,
      course_rating: tee.courseRating,
      slope: tee.slope
    }));
    const { error: teeError } = await supabase.from("tee_boxes").upsert(teeRows, {
      onConflict: "course_id,code"
    });
    if (teeError) throw teeError;

    const holeRows = normalizedCourse.holes.map((hole) => ({
      course_id: courseId,
      hole_number: hole.holeNumber,
      par: hole.par,
      handicap_index: hole.handicapIndex,
      yardage_by_tee_box: hole.yardageByTeeBox ?? {}
    }));
    const { error: holeError } = await supabase.from("course_holes").upsert(holeRows, {
      onConflict: "course_id,hole_number"
    });
    if (holeError) throw holeError;

    console.log(`Upserted course ${providerCourseRef}: ${normalizedCourse.name}`);
  }

  console.log("Old Westbury seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
