import { StationEntityResolver } from "../main_project/js/services/ai/nlu/StationEntityResolver.js";
import { TextNormalizer } from "../main_project/js/services/ai/nlu/TextNormalizer.js";

const q1 = "mujhe rohoni se kashmiri gate jana hi mujhe batao";
const q2 = "mujhe rohinie se kashmiri gate ki metro batao";

console.log("Q1 norm:", TextNormalizer.normalize(q1));
console.log("Q2 norm:", TextNormalizer.normalize(q2));
