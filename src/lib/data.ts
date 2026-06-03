import "server-only";
import { readJsonFile, writeJsonFile } from "@/lib/site-storage";
import { normalizeCast } from "@/lib/cast-roles";
import type { Announcement, Cast, MediaArchive, ScheduleEntry, SiteStatus } from "@/types";

export async function getCasts(): Promise<Cast[]> {
  const casts = await readJsonFile<Cast[]>("casts.json", []);
  return casts.map(normalizeCast).filter((c) => c.active).sort((a, b) => a.order - b.order);
}

export async function getAllCasts(): Promise<Cast[]> {
  const casts = await readJsonFile<Cast[]>("casts.json", []);
  return casts.map(normalizeCast).sort((a, b) => a.order - b.order);
}

export async function getCastById(id: string): Promise<Cast | undefined> {
  const casts = await readJsonFile<Cast[]>("casts.json", []);
  const cast = casts.find((c) => c.id === id && c.active);
  return cast ? normalizeCast(cast) : undefined;
}

export async function saveCasts(casts: Cast[]): Promise<void> {
  await writeJsonFile("casts.json", casts.map(normalizeCast));
}

export async function getSchedule(): Promise<ScheduleEntry[]> {
  return readJsonFile<ScheduleEntry[]>("schedule.json", []);
}

export async function saveSchedule(schedule: ScheduleEntry[]): Promise<void> {
  await writeJsonFile("schedule.json", schedule);
}

export async function getStatus(): Promise<SiteStatus> {
  return readJsonFile<SiteStatus>("status.json", {
    isOpen: false,
    message: "Close",
    part1: "20:50〜",
    part2: "22:00〜",
    updatedAt: new Date().toISOString(),
  });
}

export async function saveStatus(status: SiteStatus): Promise<void> {
  await writeJsonFile("status.json", status);
}

export async function getMediaArchives(): Promise<MediaArchive[]> {
  return readJsonFile<MediaArchive[]>("media.json", []);
}

export async function getAdminPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }
  const settings = await readJsonFile<{ adminPassword: string }>("settings.json", {
    adminPassword: "chuchoter-admin",
  });
  return settings.adminPassword;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const items = await readJsonFile<Announcement[]>("announcements.json", []);
  return items
    .filter((a) => a.active)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const items = await readJsonFile<Announcement[]>("announcements.json", []);
  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function saveAnnouncements(items: Announcement[]): Promise<void> {
  await writeJsonFile("announcements.json", items);
}

export function getTodayScheduleEntry(
  schedule: ScheduleEntry[],
  date = new Date()
): ScheduleEntry | undefined {
  const iso = date.toISOString().slice(0, 10);
  return schedule.find((entry) => entry.date === iso);
}
