import * as repository from "./auth.repository.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { AppError } from "../../lib/errors.js";
const dummyHash = await hashPassword("Timing-only-not-a-real-account");
export async function login({ email, password }) {
  const user = await repository.findByEmail(email);
  const valid = await verifyPassword(
    password,
    user?.password_hash || dummyHash,
  );
  if (!user?.active || !valid)
    throw new AppError("Email or password is incorrect", 401);
  return user;
}
