import type { NextRequest } from "next/server";
import { buildAuthCollectionUserKey } from "@/lib/gacha-collection";
import { buildDevCollectionUserKey } from "@/lib/gacha-collection";
import { getUserProfileLabel } from "@/lib/auth-messages";
import { readDevSession, isAuthDevEnabled } from "@/lib/auth-dev";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export interface DmRequestUser {
  userKey: string;
  displayName: string;
  email: string | null;
}

export async function resolveDmRequestUser(request: NextRequest): Promise<DmRequestUser | null> {
  if (isAuthDevEnabled()) {
    const devHeader = request.headers.get("x-dev-user-key")?.trim();
    if (devHeader?.startsWith("dev:")) {
      const devSession = readDevSession();
      const devKey = devSession?.email ? buildDevCollectionUserKey(devSession.email) : null;
      if (devSession && devKey && devHeader === devKey) {
        return {
          userKey: devKey,
          displayName: devSession.displayName,
          email: devSession.email,
        };
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

    const displayName = getUserProfileLabel(
      user.email,
      typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null
    );

    return {
      userKey: buildAuthCollectionUserKey(user.id),
      displayName,
      email: user.email ?? null,
    };
  } catch {
    return null;
  }
}
