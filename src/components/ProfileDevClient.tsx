"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfilePanel from "@/components/ProfilePanel";
import ProfileCollection from "@/components/ProfileCollection";
import {
  AUTH_DEV_LOGIN_PATH,
  clearDevSession,
  readDevSession,
  type AuthDevSession,
} from "@/lib/auth-dev";
import { buildDevCollectionUserKey } from "@/lib/gacha-collection";

export default function ProfileDevClient() {
  const router = useRouter();
  const [session, setSession] = useState<AuthDevSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(readDevSession());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !session) {
      router.replace(AUTH_DEV_LOGIN_PATH);
    }
  }, [hydrated, session, router]);

  const handleLogout = () => {
    clearDevSession();
    setSession(null);
    router.push(AUTH_DEV_LOGIN_PATH);
    router.refresh();
  };

  if (!hydrated) {
    return (
      <p className="py-12 text-center text-sm text-cream-faint" role="status">
        読み込み中…
      </p>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <ProfilePanel
        profile={{
          displayName: session.displayName,
          email: session.email,
          loggedInAt: session.loggedInAt,
          mode: "dev",
        }}
        onDisplayNameChange={(displayName) => {
          setSession((current) => (current ? { ...current, displayName } : current));
        }}
      />
      <ProfileCollection
        userKey={buildDevCollectionUserKey(session.email)}
        className="mt-10"
      />
      <div className="mx-auto mt-6 max-w-lg text-center">
        <button type="button" onClick={handleLogout} className="btn-ghost min-h-11 px-8">
          ログアウト
        </button>
      </div>
    </>
  );
}
