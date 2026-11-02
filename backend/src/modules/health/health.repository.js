import { prisma } from "../../db.js";
export const checkDatabase = () => prisma.user.count();
