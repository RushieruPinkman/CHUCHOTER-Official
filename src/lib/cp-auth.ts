import type { NextRequest } from "next/server";
import { buildAuthCollectionUserKey, buildDevCollectionUserKey } from "@/lib/gacha-collection";
import { readDevSession, isAuthDevEnabled } from "@/lib/auth-dev";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export interface CpRequestUser {
  userKey: string;
}

export async function resolveCpRequestUser(request: NextRequest): Promise<CpRequestUser | null> {
  if (isAuthDevEnabled()) {
    const devHeader = request.headers.get("x-dev-user-key")?.trim();
    if (devHeader?.startsWith("dev:")) {
      const devSession = readDevSession();
      const devKey = devSession?.email ? buildDevCollectionUserKey(devSession.email) : null;
      if (devSession && devKey && devHeader === devKey) {
        return { userKey: devKey };
      }
    }
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
