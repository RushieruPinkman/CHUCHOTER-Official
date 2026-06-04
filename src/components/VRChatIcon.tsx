interface VRChatIconProps {
  className?: string;
}

export default function VRChatIcon({ className = "h-5 w-5" }: VRChatIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2.5 4.5 19.5h4.2l3.3-6.2 3.3 6.2H19.5L12 2.5zm0 3.8 4.8 8.9h-2.6l-2.2-4.1-2.2 4.1H7.2L12 6.3z" />
    </svg>
  );
}
