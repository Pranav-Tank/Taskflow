import { success, paginated, noContent } from "../../common/response.js";
import * as service from "./task.service.js";
export const list = async (req, res) =>
  paginated(res, await service.list(req.user, req.input.query));
export const get = async (req, res) =>
  success(res, await service.get(req.user, req.params.id));
export const create = async (req, res) =>
  success(res, await service.create(req.user, req.input.body), 201);
export const update = async (req, res) =>
  success(res, await service.update(req.user, req.params.id, req.input.body));
export const remove = async (req, res) => {
  await service.remove(req.user, req.params.id);
  noContent(res);
};
export const comments = async (req, res) =>
  paginated(
    res,
    await service.history(req.user, req.params.id, "comments", req.input.query),
  );
export const activity = async (req, res) =>
  paginated(
    res,
    await service.history(req.user, req.params.id, "activity", req.input.query),
  );
export const comment = async (req, res) =>
  success(
    res,
    await service.comment(req.user, req.params.id, req.input.body.body),
    201,
  );
