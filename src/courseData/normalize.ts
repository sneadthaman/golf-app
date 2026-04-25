import { Course } from "../types";
import { CourseValidationError, ExternalCoursePayload } from "./types";

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function normalizeExternalCourse(payload: ExternalCoursePayload): Course {
  const errors: string[] = [];
  const id = payload.id?.trim();
  const name = payload.name?.trim();
  if (!id) errors.push("Missing course id");
  if (!name) errors.push("Missing course name");

  const holesInput = payload.holes ?? [];
  const holeCount = holesInput.length;
  if (holeCount !== 9 && holeCount !== 18) {
    errors.push(`Expected 9 or 18 holes, received ${holeCount}`);
  }

  const holes = holesInput.map((hole, index) => {
    const holeNumber = hole.holeNumber ?? index + 1;
    if (!isPositiveInt(holeNumber)) errors.push(`Invalid holeNumber at index ${index}`);
    if (!isPositiveInt(hole.par)) errors.push(`Invalid par for hole ${holeNumber}`);
    if (!isPositiveInt(hole.handicapIndex)) errors.push(`Invalid handicapIndex for hole ${holeNumber}`);
    return {
      holeNumber: isPositiveInt(holeNumber) ? holeNumber : index + 1,
      par: isPositiveInt(hole.par) ? hole.par : 4,
      handicapIndex: isPositiveInt(hole.handicapIndex) ? hole.handicapIndex : index + 1,
      yardageByTeeBox: hole.yardages ?? {}
    };
  });

  const handicapMode = payload.handicapMode ?? "standard18";
  const handicapIndexes = holes.map((hole) => hole.handicapIndex).sort((a, b) => a - b);
  if (handicapMode === "split9_replay") {
    if (holeCount !== 18) {
      errors.push("split9_replay mode requires 18 holes");
    } else {
      const counts = new Map<number, number>();
      for (const value of handicapIndexes) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      for (let expected = 1; expected <= 9; expected += 1) {
        if ((counts.get(expected) ?? 0) !== 2) {
          errors.push("split9_replay mode requires each handicap index 1-9 exactly twice");
          break;
        }
      }
    }
  } else if (handicapIndexes.length === holeCount && (holeCount === 9 || holeCount === 18)) {
    for (let expected = 1; expected <= holeCount; expected += 1) {
      if (handicapIndexes[expected - 1] !== expected) {
        errors.push(`Hole handicap indexes must contain each value 1-${holeCount} exactly once`);
        break;
      }
    }
  }

  const teeBoxesInput = payload.teeBoxes ?? [];
  if (!teeBoxesInput.length) errors.push("Missing tee boxes");
  const teeBoxes = teeBoxesInput.map((teeBox, index) => {
    const teeId = teeBox.id?.trim();
    const teeName = teeBox.name?.trim();
    if (!teeId) errors.push(`Missing tee box id at index ${index}`);
    if (!teeName) errors.push(`Missing tee box name at index ${index}`);
    if (!isPositiveNumber(teeBox.courseRating)) errors.push(`Invalid courseRating for tee box ${teeId ?? index}`);
    if (!isPositiveInt(teeBox.slope)) errors.push(`Invalid slope for tee box ${teeId ?? index}`);
    return {
      id: teeId ?? `tee-${index + 1}`,
      name: teeName ?? `Tee ${index + 1}`,
      color: teeBox.color?.trim() || "unknown",
      courseRating: isPositiveNumber(teeBox.courseRating) ? teeBox.courseRating : 72,
      slope: isPositiveInt(teeBox.slope) ? teeBox.slope : 113
    };
  });

  const parTotal = holes.reduce((sum, hole) => sum + hole.par, 0);
  if (payload.parTotal && payload.parTotal !== parTotal) {
    errors.push(`Provided parTotal ${payload.parTotal} does not match computed ${parTotal}`);
  }

  if (errors.length > 0) {
    throw new CourseValidationError("Invalid course payload", errors);
  }

  return {
    id: id!,
    name: name!,
    holes,
    teeBoxes,
    parTotal,
    handicapMode
  };
}
