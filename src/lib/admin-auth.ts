import type { NextRequest } from "next/server";
import { getAdminPassword } from "@/lib/data";

export async function verifyAdminRequest(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const password = await getAdminPassword();
  return token === password;
}
