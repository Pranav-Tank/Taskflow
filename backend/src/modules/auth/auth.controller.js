import * as service from "./auth.service.js";
import { publicUser } from "./auth.mapper.js";
import { issueToken, cookieOptions } from "./auth.session.js";
import { success, noContent } from "../../common/response.js";
export async function login(req, res) {
  const user = await service.login(req.input.body);
  res.cookie("taskflow_token", issueToken(user), cookieOptions);
  return success(res, publicUser(user));
}
export function logout(req, res) {
  res.clearCookie("taskflow_token", {
    ...cookieOptions,
    maxAge: undefined,
  });
  return noContent(res);
}
export const me = (req, res) => success(res, req.user);
