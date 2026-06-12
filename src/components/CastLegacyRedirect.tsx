"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** 旧 URL `/casts?cast=...` を個別ページへ転送 */
export default function CastLegacyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const castId = searchParams.get("cast");
    if (castId) {
      router.replace(`/casts/${castId}`);
    }
  }, [router, searchParams]);

  return null;
}
