"use client";

import { useEffect, useState } from "react";
import {
  buildAuthCollectionUserKey,
  buildDevCollectionUserKey,
} from "@/lib/gacha-collection";
import { AUTH_DEV_STORAGE_KEY, readDevSession } from "@/lib/auth-dev";
import { createClient } from "@/lib/supabase/client";
import { isUserAuthEnabled } from "@/lib/supabase/config";

export function useCollectionUserKey(): string | null {
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    function resolveDevUserKey(): string | null {
      const devSession = readDevSession();
      return devSession?.email ? buildDevCollectionUserKey(devSession.email) : null;
    }

    const devKey = resolveDevUserKey();
    if (devKey) {
      setUserKey(devKey);

      const onStorage = (event: StorageEvent) => {
        if (event.key !== AUTH_DEV_STORAGE_KEY) return;
        setUserKey(resolveDevUserKey());
      };

      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    if (!isUserAuthEnabled()) {
      setUserKey(null);
      return;
    }

    let mounted = true;

    try {
      const supabase = createClient();

      supabase.auth.getUser().then(({ data }) => {
        if (!mounted) return;
        setUserKey(data.user?.id ? buildAuthCollectionUserKey(data.user.id) : null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUserKey(session?.user?.id ? buildAuthCollectionUserKey(session.user.id) : null);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      if (mounted) setUserKey(null);
    }
  }, []);

  return userKey;
}
