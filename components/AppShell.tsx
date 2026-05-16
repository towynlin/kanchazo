"use client";
import type { ReactNode } from "react";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Team, User } from "@/lib/db/schema";
import GrassStripe from "./GrassStripe";
import Logo from "./Logo";

interface TeamContextValue {
  currentTeam: Team | null;
  setCurrentTeamId: (id: string) => void;
  teams: Team[];
}

export const TeamContext = createContext<TeamContextValue>({
  currentTeam: null,
  setCurrentTeamId: () => {},
  teams: [],
});

export function useTeam() {
  return useContext(TeamContext);
}

interface Props {
  user: User;
  teams: Team[];
  initialTeamId?: string;
  chatUnread?: boolean;
  children: ReactNode;
}

export default function AppShell({
  user,
  teams,
  initialTeamId,
  chatUnread = false,
  children,
}: Props) {
  const router = useRouter();
  const [currentTeamId, setCurrentTeamId] = useState<string>(initialTeamId ?? teams[0]?.id ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();

  const currentTeam = teams.find((t) => t.id === currentTeamId) ?? teams[0] ?? null;

  function handleTeamSwitch(id: string) {
    setCurrentTeamId(id);
    setSheetOpen(false);
    document.cookie = `kanchazo_team=${id}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  const tabs = [
    { href: "/schedule", label: "Schedule", icon: "📅", badge: false },
    { href: "/roster", label: "Roster", icon: "👥", badge: false },
    { href: "/chat", label: "Chat", icon: "💬", badge: chatUnread },
  ];

  return (
    <TeamContext.Provider value={{ currentTeam, setCurrentTeamId: handleTeamSwitch, teams }}>
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-mk-bg">
        {/* Header band */}
        <header className="bg-mk-sky text-white sticky top-0 z-10 shadow-mk-header">
          <div className="px-[22px] pt-5 pb-[18px]">
            <div className="flex items-center justify-between mb-3">
              <Link href="/schedule" aria-label="Home" className="min-h-0" style={{ minHeight: 0 }}>
                <Logo />
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] font-body font-extrabold min-h-0"
                style={{ background: "rgba(255,255,255,0.15)", minHeight: 0 }}
              >
                {user.name.charAt(0).toUpperCase()}
              </Link>
            </div>

            <button
              onClick={() => setSheetOpen(true)}
              disabled={teams.length <= 1}
              className="block text-left min-h-0 disabled:cursor-default"
              style={{ minHeight: 0 }}
            >
              <div className="eyebrow mb-1">
                {teams.length > 1 ? "Tap to switch team" : "Your team"}
              </div>
              <div className="flex items-end justify-between gap-3">
                <h1 className="font-display font-extrabold text-[34px] leading-none text-white">
                  {currentTeam?.name ?? "No team"}
                  {teams.length > 1 && (
                    <span className="ml-2 align-middle text-white/60 text-2xl font-body font-bold">
                      ›
                    </span>
                  )}
                </h1>
              </div>
            </button>
          </div>
          <GrassStripe />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-mk-bg">{children}</main>

        {/* Bottom navigation */}
        <nav className="bg-mk-bg border-t border-mk-border-card flex pt-[10px] pb-[22px] px-5">
          {tabs.map(({ href, label, icon, badge }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] ${
                  active ? "text-mk-sky" : "text-mk-text-muted"
                }`}
              >
                <span className="relative text-[22px] leading-none">
                  {icon}
                  {badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-mk-grass rounded-full ring-2 ring-mk-bg" />
                  )}
                </span>
                <span
                  className="font-body font-bold text-[9px] uppercase"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Team selector bottom sheet */}
        {sheetOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setSheetOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-mk-bg rounded-t-[40px] z-30 pb-safe overflow-hidden">
              <div className="p-4 border-b border-mk-border-card">
                <h2 className="font-display font-extrabold text-[18px] text-mk-text text-center">
                  Switch team
                </h2>
              </div>
              <ul className="py-2">
                {teams.map((team) => (
                  <li key={team.id}>
                    <button
                      onClick={() => handleTeamSwitch(team.id)}
                      className={`w-full text-left px-5 py-3 flex items-center justify-between min-h-[56px] font-body ${
                        team.id === currentTeamId
                          ? "text-mk-sky font-extrabold"
                          : "text-mk-text font-semibold"
                      }`}
                    >
                      {team.name}
                      {team.id === currentTeamId && <span>✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="p-4 border-t border-mk-border-card">
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-full py-3 text-mk-text-secondary font-body font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </TeamContext.Provider>
  );
}
