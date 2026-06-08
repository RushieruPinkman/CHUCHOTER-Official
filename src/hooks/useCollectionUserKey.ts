"use client";

import { useEffect, useState } from "react";
import {
  buildAuthCollectionUserKey,
  buildDevCollectionUserKey,
} from "@/lib/gacha-collection";
import { AUTH_DEV_STORAGE_KEY, readDevSession } from "@/lib/auth-dev";
import { createClient } from "@/lib/supabase/client";
import { isUserAuthEnabled } from "@/lib/supabase/config";

export interface CollectionUserKeyState {
  userKey: string | null;
  ready: boolean;
}

export function useCollectionUserKey(): CollectionUserKeyState {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function resolveDevUserKey(): string | null {
      const devSession = readDevSession();
      return devSession?.email ? buildDevCollectionUserKey(devSession.email) : null;
    }

    const devKey = resolveDevUserKey();
    if (devKey) {
      setUserKey(devKey);
      setReady(true);

      const onStorage = (event: StorageEvent) => {
        if (event.key !== AUTH_DEV_STORAGE_KEY) return;
        setUserKey(resolveDevUserKey());
      };

      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }

    if (!isUserAuthEnabled()) {
      setUserKey(null);
      setReady(true);
      return;
    }

    let mounted = true;

    try {
      const supabase = createClient();

      supabase.auth.getUser().then(({ data }) => {
        if (!mounted) return;
        setUserKey(data.user?.id ? buildAuthCollectionUserKey(data.user.id) : null);
        setReady(true);
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
      if (mounted) {
        setUserKey(null);
        setReady(true);
      }
    }
  }, []);

  return { userKey, ready };
}
