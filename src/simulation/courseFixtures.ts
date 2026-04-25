import { Course } from "../types";

const parsByHole = [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];

const whiteYardages = [
  390, 420, 175, 405, 520, 410, 165, 430, 535, 400, 415, 180, 510, 395, 425, 170, 440, 525
];

const blueYardages = [
  420, 450, 195, 435, 550, 440, 185, 460, 565, 430, 445, 200, 540, 425, 455, 190, 470, 555
];

const goldYardages = [
  350, 375, 145, 360, 470, 365, 135, 385, 480, 355, 370, 150, 460, 350, 380, 140, 395, 475
];

export function createSimplePar72Course(): Course {
  const holes = parsByHole.map((par, idx) => {
    const holeNumber = idx + 1;
    return {
      holeNumber,
      par,
      handicapIndex: holeNumber,
      yardageByTeeBox: {
        blue: blueYardages[idx],
        white: whiteYardages[idx],
        gold: goldYardages[idx]
      }
    };
  });

  return {
    id: "course-simple-par72",
    name: "Simple Par 72",
    holes,
    parTotal: holes.reduce((sum, hole) => sum + hole.par, 0),
    teeBoxes: [
      { id: "blue", name: "Blue Tees", color: "blue", courseRating: 72.8, slope: 132 },
      { id: "white", name: "White Tees", color: "white", courseRating: 70.9, slope: 126 },
      { id: "gold", name: "Gold Tees", color: "gold", courseRating: 68.2, slope: 118 }
    ]
  };
}
