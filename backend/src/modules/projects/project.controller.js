import { success, paginated, noContent } from "../../common/response.js";
import * as service from "./project.service.js";
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
export const addMember = async (req, res) =>
  success(
    res,
    await service.addMember(req.user, req.params.id, req.input.body),
  );
export const removeMember = async (req, res) => {
  await service.removeMember(req.user, req.params.id, req.input.body.userId);
  noContent(res);
};
