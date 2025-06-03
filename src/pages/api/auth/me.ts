import type { NextApiRequest, NextApiResponse } from "next";
import authController from "@/modules/auth/auth.controller";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return authController.getCurrentUser(req, res);
}