import authController from "@/modules/auth/auth.controller";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return authController.getCurrentUser(req, res);
}