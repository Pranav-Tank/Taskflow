import { checkDatabase } from "./health.repository.js";
import { healthView } from "./health.mapper.js";
export async function check() {
  await checkDatabase();
  return healthView();
}
