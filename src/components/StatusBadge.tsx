import type { SiteStatus } from "@/types";

interface StatusBadgeProps {
  status: SiteStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 border px-5 py-2 text-[13px] tracking-wide ${
        status.isOpen
          ? "border-gold/30 bg-gold/[0.06] text-gold"
          : "border-[var(--color-border)] bg-surface/80 text-cream-muted"
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status.isOpen ? "animate-pulse bg-gold shadow-[0_0_8px_rgba(201,169,98,0.8)]" : "bg-cream-faint"
        }`}
        aria-hidden="true"
      />
      <span>
        {status.isOpen ? (
          <>
            {status.message}
            <span className="mx-2.5 text-cream-faint">·</span>
            1部 {status.part1}
            <span className="mx-1.5 text-cream-faint">/</span>
            2部 {status.part2}
          </>
        ) : (
          "Close — 本日は休業日"
        )}
      </span>
    </div>
  );
}
