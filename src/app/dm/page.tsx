import type { Metadata } from "next";
import { Suspense } from "react";
import DmPanel from "@/components/DmPanel";
import PageHero from "@/components/PageHero";
import { DM_RETENTION_NOTICE } from "@/lib/dm";

export const metadata: Metadata = {
  title: "運営DM",
  robots: { index: false, follow: false },
};

export default function DmPage() {
  return (
    <>
      <PageHero
        titleEn="Contact"
        titleJa="運営DM"
        description={`CHUCHOTER 運営への連絡窓口です。${DM_RETENTION_NOTICE}`}
      />
      <section className="site-container pb-16">
        <Suspense fallback={<div className="py-8 text-center text-sm text-cream-faint">読み込み中…</div>}>
          <DmPanel loginNextPath="/dm" />
        </Suspense>
      </section>
    </>
  );
}
