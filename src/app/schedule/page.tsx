import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ScrollReveal from "@/components/ScrollReveal";
import DailyTaskTracker from "@/components/DailyTaskTracker";
import { formatJapaneseDate, getWeekDates, SITE } from "@/lib/site";
import { getAllCasts, getSchedule } from "@/lib/data";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "予定表",
  description:
    "CHUCHOTER（シュシュテ）の今週の営業予定と出勤キャストのシフト。VRChat イベントの開催日・1部・2部の出勤状況を確認できます。",
  path: "/schedule",
});

const STATUS = {
  open: { label: "営業", className: "text-gold border-gold/30 bg-gold/[0.06]" },
  closed: { label: "休業", className: "text-cream-muted border-[var(--color-border)] bg-surface" },
  special: { label: "特別", className: "text-gold-bright border-gold/40 bg-gold/10" },
};

export default async function SchedulePage() {
  const [schedule, casts] = await Promise.all([getSchedule(), getAllCasts()]);
  const weekDates = getWeekDates();
  const castMap = Object.fromEntries(casts.map((c) => [c.id, c.name]));
  const today = new Date().toISOString().slice(0, 10);

  const weekEntries = weekDates.map((date) => {
    const entry = schedule.find((s) => s.date === date);
    return (
      entry ?? {
        id: date,
        date,
        status: "closed" as const,
        part1Casts: [],
        part2Casts: [],
        note: "未設定",
      }
    );
  });

  return (
    <>
      <DailyTaskTracker taskId="visit_schedule" />
      <PageHero
        titleEn="Schedule"
        titleJa="予定表"
        description="今週の営業日と出勤キャストのシフトをご確認いただけます。"
      />

      <section className="pb-14 md:pb-16" aria-label="週間シフト表">
        <div className="site-container">
          <ScrollReveal>
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">今週の営業スケジュール</caption>
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {["日付", "状態", `1部 ${SITE.part1Time}〜`, `2部 ${SITE.part2Time}〜`, "備考"].map((col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-5 py-4 text-[11px] font-normal tracking-[0.2em] text-gold uppercase"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekEntries.map((entry) => {
                    const statusInfo = STATUS[entry.status];
                    const isToday = entry.date === today;

                    return (
                      <tr
                        key={entry.id}
                        aria-current={isToday ? "date" : undefined}
                        className={`border-b border-[var(--color-border)] transition-colors ${
                          isToday ? "bg-gold/[0.04]" : ""
                        }`}
                      >
                        <td className="px-5 py-4 text-cream">
                          {formatJapaneseDate(entry.date)}
                          {isToday && (
                            <span className="ml-2 text-[10px] tracking-widest text-gold" aria-hidden="true">TODAY</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block border px-2.5 py-0.5 text-[11px] tracking-wider ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-cream-muted">
                          {entry.part1Casts.length > 0
                            ? entry.part1Casts.map((id) => castMap[id] ?? id).join(" · ")
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-cream-muted">
                          {entry.part2Casts.length > 0
                            ? entry.part2Casts.map((id) => castMap[id] ?? id).join(" · ")
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-cream-faint">{entry.note || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="mt-5">
            <p className="text-[11px] tracking-wide text-cream-faint">
              ※ 予定は変更になる場合があります。最新情報は公式Xをご確認ください。
            </p>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
