let lockCount = 0;

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;

  lockCount += 1;
  if (lockCount > 1) return;

  document.documentElement.classList.add("scroll-locked");
  document.body.classList.add("scroll-locked");
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  document.documentElement.classList.remove("scroll-locked");
  document.body.classList.remove("scroll-locked");
}
