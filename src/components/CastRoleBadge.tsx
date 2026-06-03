import { getCastRoleLabel, normalizeCastRole } from "@/lib/cast-roles";
import type { CastRole } from "@/types";

interface CastRoleBadgeProps {
  role: CastRole | string | undefined;
  className?: string;
}

export default function CastRoleBadge({ role, className = "" }: CastRoleBadgeProps) {
  const normalized = normalizeCastRole(role);

  return (
    <span
      className={`cast-role-badge cast-role-badge--${normalized} ${className}`.trim()}
    >
      {getCastRoleLabel(normalized)}
    </span>
  );
}
