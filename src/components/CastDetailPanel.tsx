import Link from "next/link";
import CastPortrait from "@/components/CastPortrait";
import CastRoleBadge from "@/components/CastRoleBadge";
import CastVoicePlayer from "@/components/CastVoicePlayer";
import type { Cast } from "@/types";

export default function CastDetailPanel({ cast }: { cast: Cast }) {
  return (
    <article className="site-container pb-14 md:pb-16">
      <nav aria-label="パンくず" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-cream-muted">
          <li>
            <Link href="/" className="link-gold hover:text-gold">
              エントランス
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/casts" className="link-gold hover:text-gold">
              住人紹介
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-cream">
            {cast.name}
          </li>
        </ol>
      </nav>

      <div className="panel overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden md:overflow-y-auto">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
            <div className="relative shrink-0 overflow-hidden bg-deep" style={{ flex: "0 0 55%" }}>
              <CastPortrait
                src={cast.image}
                alt={`${cast.name}のポートレート`}
                variant="cover"
                sizes="100vw"
                priority
                className="object-top"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-void via-void/70 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <CastRoleBadge role={cast.role} className="mb-2" />
                <p className="font-display text-lg leading-tight text-gold">{cast.nameEn}</p>
                <p className="text-xs text-cream-muted">{cast.name}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[var(--color-border)] px-4 py-3">
              <p className="font-serif-jp text-xs leading-relaxed text-gold/90">{cast.tagline}</p>
              {cast.voiceUrl ? <CastVoicePlayer src={cast.voiceUrl} className="my-3" /> : null}
              <div className="hairline my-2" />
              <p className="whitespace-pre-line text-xs leading-relaxed text-cream-muted">{cast.bio}</p>
            </div>
          </div>

          <div className="hidden gap-10 p-8 md:grid md:grid-cols-[0.85fr_1.15fr]">
            <div className="border border-[var(--color-border)] bg-deep">
              <CastPortrait
                src={cast.image}
                alt={`${cast.name}のポートレート`}
                variant="natural"
                priority
              />
            </div>

            <div className="flex flex-col justify-center">
              <CastRoleBadge role={cast.role} className="mb-3" />
              <p className="font-display mb-1 text-3xl text-gold">{cast.nameEn}</p>
              <p className="mb-4 text-lg text-cream-muted">{cast.name}</p>
              <p className="font-serif-jp mb-4 text-lg text-gold/90">{cast.tagline}</p>
              {cast.voiceUrl ? <CastVoicePlayer src={cast.voiceUrl} className="mb-6" /> : null}
              <div className="hairline mb-6" />
              <p className="whitespace-pre-line pb-1 text-[15px] leading-[2] text-cream-muted">
                {cast.bio}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/casts" className="btn-ghost">
          住人一覧へ戻る
        </Link>
      </div>
    </article>
  );
}
