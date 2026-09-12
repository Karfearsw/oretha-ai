"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";
import type { SessionUser } from "@/lib/auth";

const UserContext = createContext<SessionUser | null>(null);

/** Read the signed-in user anywhere inside the app shell. */
export function useSessionUser() {
  return useContext(UserContext);
}

function useChromeHidden() {
  const pathname = usePathname();
  return /^\/chats\/(?!agents$).+/.test(pathname);
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const hidden = useChromeHidden();

  if (hidden) {
    return (
      <UserContext.Provider value={user}>
        <div className="mx-auto flex min-h-dvh max-w-[32rem] flex-col bg-canvas">
          {children}
        </div>
      </UserContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <div className="mx-auto flex min-h-dvh max-w-[32rem] flex-col bg-canvas">
        <div className="pad-safe-bottom-nav">{children}</div>
        <BottomNav />
        <FloatingActionButton />
      </div>
    </UserContext.Provider>
  );
}
