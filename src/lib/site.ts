export const SITE = {
  name: "CHUCHOTER",
  logo: "/images/logo.png", // 背景透過PNG必須 · 差替後は npm run logo:transparent
  favicon: "/icon.svg",
  appleIcon: "/apple-icon.svg",
  logoAlt:
    "CHUCHOTER — La meilleure guérison pour vous. 高級隠れ家クラブのロゴ",
  tagline: "あなたに最高の癒しを。",
  description:
    "VRChatで静かで質の高い1対1コミュニケーションを提供する、高級隠れ家クラブ。Le Ciel Blanc・黒糖アメへのRequest Inviteはこちら。",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://club-chuchoter.example.com",
  xUrl: "https://x.com/CHUCHOTER_VRC?s=20",
  ogImage: "/images/logo.png",
  part1Time: "20:50",
  part2Time: "22:00",
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "Entrance", labelJa: "エントランス" },
  { href: "/system", label: "Guide", labelJa: "ご案内" },
  { href: "/casts", label: "Residents", labelJa: "住人紹介" },
  { href: "/schedule", label: "Schedule", labelJa: "予定表" },
  { href: "/media", label: "Lounge", labelJa: "ラウンジ" },
] as const;

export function formatJapaneseDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日（${weekday}）`;
}

export function getWeekDates(startDate = new Date()): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
