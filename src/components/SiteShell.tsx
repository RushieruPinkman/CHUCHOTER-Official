"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { NavBadgesProvider } from "@/components/NavBadgesProvider";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <main
        id="main-content"
        className="relative z-10 w-full max-w-full flex-1 overflow-x-hidden"
      >
        {children}
      </main>
    );
  }

  return (
    <NavBadgesProvider>
      <Header />
      <main
        id="main-content"
        className="relative z-10 w-full max-w-full flex-1 overflow-x-hidden"
      >
        {children}
      </main>
      <Footer />
    </NavBadgesProvider>
  );
}
