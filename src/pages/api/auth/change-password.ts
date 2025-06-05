import { isAuthenticated } from "@/middlewares/auth";
import authController from "@/modules/auth/auth.controller";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Use the isAuthenticated middleware to ensure the user is authenticated
  return isAuthenticated(req, res, () => {
    return authController.changePassword(req, res);
  });
}