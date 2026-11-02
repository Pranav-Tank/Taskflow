import * as service from "./user.service.js";
import { userView } from "./user.mapper.js";
import { success, paginated } from "../../common/response.js";
export async function list(req, res) {
  const result = await service.list(req.user, req.input.query);
  return paginated(res, {
    ...result,
    data: result.data.map(userView),
  });
}
export async function options(req, res) {
  const result = await service.list(req.user, req.input.query, true);
  return paginated(res, {
    ...result,
    data: result.data.map(userView),
  });
}
export async function create(req, res) {
  return success(res, userView(await service.create(req.input.body)), 201);
}
export async function update(req, res) {
  return success(
    res,
    userView(await service.update(req.user, req.params.id, req.input.body)),
  );
}
