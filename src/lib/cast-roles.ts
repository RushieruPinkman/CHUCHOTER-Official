import type { Cast, CastRole } from "@/types";

export const CAST_ROLES: CastRole[] = ["owner", "co-owner", "cast", "staff"];

export const CAST_ROLE_LABELS: Record<CastRole, string> = {
  owner: "オーナー",
  "co-owner": "副オーナー",
  cast: "キャスト",
  staff: "スタッフ",
};

export const CAST_ROLE_ORDER: Record<CastRole, number> = {
  owner: 0,
  "co-owner": 1,
  cast: 2,
  staff: 3,
};

const LEGACY_ROLE_MAP: Record<string, CastRole> = {
  host: "owner",
};

export function normalizeCastRole(role: string | undefined): CastRole {
  if (!role) return "cast";
  if (role in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[role];
  if (CAST_ROLES.includes(role as CastRole)) return role as CastRole;
  return "cast";
}

export function normalizeCast(cast: Cast): Cast {
  return {
    ...cast,
    role: normalizeCastRole(cast.role),
    gender: cast.gender ?? "female",
  };
}

export function sortCastsByRoleAndOrder(a: Cast, b: Cast): number {
  const roleDiff = CAST_ROLE_ORDER[a.role] - CAST_ROLE_ORDER[b.role];
  if (roleDiff !== 0) return roleDiff;
  return a.order - b.order;
}

export function getCastRoleLabel(role: CastRole | string | undefined): string {
  return CAST_ROLE_LABELS[normalizeCastRole(role)];
}
