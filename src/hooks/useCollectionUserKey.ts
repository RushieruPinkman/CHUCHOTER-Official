"use client";

import { useEffect, useState } from "react";
import {
  buildAuthCollectionUserKey,
  buildDevCollectionUserKey,
} from "@/lib/gacha-collection";
import { getUserProfileLabel } from "@/lib/auth-messages";
import {
  AUTH_DEV_STORAGE_KEY,
  AUTH_DEV_UPDATED_EVENT,
  readDevSession,
} from "@/lib/auth-dev";
import {
  AUTH_MEMBER_UPDATED_EVENT,
  readAuthMemberUpdatedDisplayName,
} from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";
import { isUserAuthEnabled } from "@/lib/supabase/config";

export interface CollectionUserKeyState {
  userKey: string | null;
  memberLabel: string | null;
  ready: boolean;
}

function resolveDevAuthState(): Pick<CollectionUserKeyState, "userKey" | "memberLabel"> {
  const devSession = readDevSession();
  if (!devSession?.email) {
    return { userKey: null, memberLabel: null };
  }

  return {
    userKey: buildDevCollectionUserKey(devSession.email),
    memberLabel: devSession.displayName,
  };
}

function resolveMemberLabel(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): string | null {
  if (!user) return null;
  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null;
  return getUserProfileLabel(user.email, displayName);
}

export function useCollectionUserKey(): CollectionUserKeyState {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [memberLabel, setMemberLabel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const devState = resolveDevAuthState();
    if (devState.userKey) {
      setUserKey(devState.userKey);
      setMemberLabel(devState.memberLabel);
      setReady(true);

      const refreshDev = () => {
        const next = resolveDevAuthState();
        setUserKey(next.userKey);
        setMemberLabel(next.memberLabel);
      };

      const onStorage = (event: StorageEvent) => {
        if (event.key !== AUTH_DEV_STORAGE_KEY) return;
        refreshDev();
      };

      window.addEventListener("storage", onStorage);
      window.addEventListener(AUTH_DEV_UPDATED_EVENT, refreshDev);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(AUTH_DEV_UPDATED_EVENT, refreshDev);
      };
    }

    if (!isUserAuthEnabled()) {
      setUserKey(null);
      setMemberLabel(null);
      setReady(true);
      return;
    }

    let mounted = true;

    try {
      const supabase = createClient();

      supabase.auth.getUser().then(({ data }) => {
        if (!mounted) return;
        setUserKey(data.user?.id ? buildAuthCollectionUserKey(data.user.id) : null);
        setMemberLabel(resolveMemberLabel(data.user));
        setReady(true);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUserKey(session?.user?.id ? buildAuthCollectionUserKey(session.user.id) : null);
        setMemberLabel(resolveMemberLabel(session?.user ?? null));
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      if (mounted) {
        setUserKey(null);
        setMemberLabel(null);
        setReady(true);
      }
    }
  }, []);

  useEffect(() => {
    const onMemberUpdated = (event: Event) => {
      const displayName = readAuthMemberUpdatedDisplayName(event);
      if (displayName) setMemberLabel(displayName);
    };

    window.addEventListener(AUTH_MEMBER_UPDATED_EVENT, onMemberUpdated);
    return () => window.removeEventListener(AUTH_MEMBER_UPDATED_EVENT, onMemberUpdated);
  }, []);

  return { userKey, ready, memberLabel };
}
