import type { Metadata } from "next";
import AdminPanel from "@/components/AdminPanel";
import { getMissingSupabaseEnvVars, isRemoteStorageEnabled } from "@/lib/supabase-admin";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "管理画面",
  description: "CHUCHOTER サイト管理画面。",
  path: "/admin",
  index: false,
  follow: false,
});

export default function AdminPage() {
  const readOnlyHost = process.env.VERCEL === "1" && !isRemoteStorageEnabled();

  return (
    <AdminPanel
      readOnlyHost={readOnlyHost}
      remoteStorage={isRemoteStorageEnabled()}
      missingSupabaseEnv={getMissingSupabaseEnvVars()}
    />
  );
}
