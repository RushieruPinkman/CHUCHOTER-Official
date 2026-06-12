import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo";

export default function StructuredData() {
  const payload = [buildOrganizationJsonLd(), buildWebSiteJsonLd()];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
