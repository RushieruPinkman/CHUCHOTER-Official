import type { NextRequest } from "next/server";
import { buildAuthCollectionUserKey } from "@/lib/gacha-collection";
import { getUserProfileLabel } from "@/lib/auth-messages";
import {
  resolveDevRequestDisplayName,
  resolveDevRequestUserKey,
} from "@/lib/auth-dev-request";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export interface DmRequestUser {
  userKey: string;
  displayName: string;
  email: string | null;
}

export async function resolveDmRequestUser(request: NextRequest): Promise<DmRequestUser | null> {
  const devUserKey = resolveDevRequestUserKey(request);
  if (devUserKey) {
    const email = devUserKey.slice(4);
    return {
      userKey: devUserKey,
      displayName: resolveDevRequestDisplayName(request, email),
      email,
    };
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
