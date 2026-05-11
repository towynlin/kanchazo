"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Team, User } from "@/lib/db/schema";

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
  children: React.ReactNode;
}

export default function AppShell({ user, teams, children }: Props) {
  const [currentTeamId, setCurrentTeamId] = useState<string>(
    teams[0]?.id ?? "",
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();

  const currentTeam = teams.find((t) => t.id === currentTeamId) ?? teams[0] ?? null;

  function handleTeamSwitch(id: string) {
    setCurrentTeamId(id);
    setSheetOpen(false);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("kanchazo_team", id);
    }
  }

  const tabs = [
    { href: "/schedule", label: "Schedule", icon: "📅" },
    { href: "/roster", label: "Roster", icon: "👥" },
    { href: "/chat", label: "Chat", icon: "💬" },
  ];

  return (
    <TeamContext.Provider
      value={{ currentTeam, setCurrentTeamId: handleTeamSwitch, teams }}
    >
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-white">
        {/* Team header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 text-lg font-semibold min-h-[44px]"
            disabled={teams.length <= 1}
          >
            <span>{currentTeam?.name ?? "No team"}</span>
            {teams.length > 1 && <span className="text-gray-400 text-base">›</span>}
          </button>
          <Link
            href="/settings"
            className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold"
            aria-label="Settings"
          >
            {user.name.charAt(0).toUpperCase()}
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Bottom navigation */}
        <nav className="border-t border-gray-200 bg-white flex">
          {tabs.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-1 min-h-[56px]
                  ${active ? "text-blue-600" : "text-gray-500"}`}
              >
                <span className="text-xl">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Team selector bottom sheet */}
        {sheetOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-20"
              onClick={() => setSheetOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl z-30 pb-safe">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-center">Switch team</h2>
              </div>
              <ul className="py-2">
                {teams.map((team) => (
                  <li key={team.id}>
                    <button
                      onClick={() => handleTeamSwitch(team.id)}
                      className={`w-full text-left px-5 py-3 flex items-center justify-between min-h-[56px]
                        ${team.id === currentTeamId ? "text-blue-600 font-medium" : "text-gray-800"}`}
                    >
                      {team.name}
                      {team.id === currentTeamId && <span>✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-full py-3 text-gray-600 font-medium"
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
