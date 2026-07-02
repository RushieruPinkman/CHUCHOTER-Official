import type { NextRequest } from "next/server";
import { buildAuthCollectionUserKey } from "@/lib/gacha-collection";
import { resolveDevRequestUserKey } from "@/lib/auth-dev-request";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export interface CpRequestUser {
  userKey: string;
}

export async function resolveCpRequestUser(request: NextRequest): Promise<CpRequestUser | null> {
  const devUserKey = resolveDevRequestUserKey(request);
  if (devUserKey) {
    return { userKey: devUserKey };
  }

  if (!isUserAuthEnabledOnServer()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return null;
    return { userKey: buildAuthCollectionUserKey(user.id) };
  } catch {
    return null;
  }
}

export async function resolveCpRequestUserFromSession(): Promise<CpRequestUser | null> {
  if (!isUserAuthEnabledOnServer()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return null;
    return { userKey: buildAuthCollectionUserKey(user.id) };
  } catch {
    return null;
  }
}
