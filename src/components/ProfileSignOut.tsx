import { signOutAction } from "@/app/login/actions";

export default function ProfileSignOut() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="btn-ghost min-h-11 px-8">
        ログアウト
      </button>
    </form>
  );
}
