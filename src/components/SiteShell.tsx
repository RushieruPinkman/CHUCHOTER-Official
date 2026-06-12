"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Header />}
      <main
        id="main-content"
        className="relative z-10 w-full max-w-full flex-1 overflow-x-hidden"
      >
        {children}
      </main>
      {!isAdmin && <Footer />}
    </>
  );
}
