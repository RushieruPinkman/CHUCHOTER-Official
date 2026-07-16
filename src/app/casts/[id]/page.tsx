import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoJsonLd from "@/components/SeoJsonLd";
import PageHero from "@/components/PageHero";
import CastDetailPanel from "@/components/CastDetailPanel";
import { getCastById, getCasts } from "@/lib/data";
import {
  buildCastBreadcrumbJsonLd,
  buildCastDescription,
  buildCastProfilePageJsonLd,
} from "@/lib/cast-seo";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

interface CastDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const casts = await getCasts();
  return casts.map((cast) => ({ id: cast.id }));
}

export async function generateMetadata({ params }: CastDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const cast = await getCastById(id);
  if (!cast) {
    return { robots: { index: false, follow: false } };
  }

  return buildPageMetadata({
    title: `${cast.name}（${cast.nameEn}）`,
    description: buildCastDescription(cast),
    path: `/casts/${cast.id}`,
    ogImage: absoluteUrl(cast.image),
    ogImageAlt: `${cast.name} — ${cast.tagline}`,
  });
}

export default async function CastDetailPage({ params }: CastDetailPageProps) {
  const { id } = await params;
  const cast = await getCastById(id);
  if (!cast) notFound();

  const structuredData = [buildCastProfilePageJsonLd(cast), buildCastBreadcrumbJsonLd(cast)];

  return (
    <>
      <SeoJsonLd data={structuredData} />
      <PageHero titleEn="Resident" titleJa={cast.name} description={cast.tagline} />
      <CastDetailPanel cast={cast} />
    </>
  );
}
