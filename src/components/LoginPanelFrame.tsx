import UserIcon from "@/components/UserIcon";

interface LoginPanelFrameProps {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}

export default function LoginPanelFrame({
  children,
  className = "",
  centered = false,
}: LoginPanelFrameProps) {
  return (
    <div className={`login-panel mx-auto max-w-md ${className}`.trim()}>
      <div className="login-panel__mark" aria-hidden="true">
        <span className="login-panel__icon-ring">
          <UserIcon className="h-5 w-5" />
        </span>
      </div>
      <div className={`login-panel__body ${centered ? "text-center" : ""}`.trim()}>{children}</div>
    </div>
  );
}
