interface UserIconProps {
  className?: string;
}

export default function UserIcon({ className = "h-5 w-5" }: UserIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor">
      <circle cx="12" cy="8" r="3.5" strokeWidth="1.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.5 19.5c.9-3.2 3.4-5 6.5-5s5.6 1.8 6.5 5"
      />
    </svg>
  );
}
