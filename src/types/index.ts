export interface Cast {
  id: string;
  name: string;
  nameEn: string;
  role: "host" | "cast";
  gender: "male" | "female";
  tagline: string;
  bio: string;
  image: string;
  xUrl?: string;
  vrchatUrl?: string;
  order: number;
  active: boolean;
}

export interface ScheduleEntry {
  id: string;
  date: string;
  status: "open" | "closed" | "special";
  part1Casts: string[];
  part2Casts: string[];
  note?: string;
}

export interface SiteStatus {
  isOpen: boolean;
  message: string;
  part1: string;
  part2: string;
  updatedAt: string;
}

export interface MediaArchive {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  active: boolean;
  pinned: boolean;
}

export interface AdminSettings {
  adminPassword: string;
}
