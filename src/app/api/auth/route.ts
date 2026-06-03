import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password: string };
    const adminPassword = await getAdminPassword();

    if (password !== adminPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({ token: password });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
