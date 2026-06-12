import type { Metadata } from "next";
import { Suspense } from "react";
import DmPanel from "@/components/DmPanel";
import PageHero from "@/components/PageHero";
import { DM_RETENTION_NOTICE } from "@/lib/dm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "運営DM",
  description: `CHUCHOTER 運営への連絡窓口。${DM_RETENTION_NOTICE}`,
  path: "/dm",
  index: false,
  follow: false,
});

export default function DmPage() {
  return (
    <div className="dm-page">
      <PageHero
        titleEn="Contact"
        titleJa="運営DM"
        description={`CHUCHOTER 運営への連絡窓口です。${DM_RETENTION_NOTICE}`}
        compact
      />
      <section className="dm-page__body site-container flex min-h-0 flex-1 flex-col overflow-hidden pb-0 md:pb-16">
        <Suspense fallback={<div className="py-8 text-center text-sm text-cream-faint">読み込み中…</div>}>
          <DmPanel loginNextPath="/dm" />
        </Suspense>
      </section>
    </div>
  );
}
