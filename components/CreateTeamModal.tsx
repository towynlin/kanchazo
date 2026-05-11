"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
];

interface Props {
  onClose: () => void;
}

export default function CreateTeamModal({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), timeZone }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create team");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl z-30 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold">Create a team</h2>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl leading-none min-h-0"
            style={{ minHeight: "auto" }}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Tigers U10"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time zone</label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIME_ZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-base disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create team"}
          </button>
        </form>
      </div>
    </>
  );
}
