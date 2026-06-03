import type { Metadata } from "next";
import AdminPanel from "@/components/AdminPanel";
import { isRemoteStorageEnabled } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "管理画面",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  const readOnlyHost = process.env.VERCEL === "1" && !isRemoteStorageEnabled();

  return <AdminPanel readOnlyHost={readOnlyHost} remoteStorage={isRemoteStorageEnabled()} />;
}
