"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  user: { id: string; name: string; email: string | null; phone: string };
  passkeys: Array<{
    id: string;
    deviceName: string | null;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
}

export default function SettingsClient({ user, passkeys }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || null }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut(everywhere = false) {
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ everywhere }),
    });
    router.push("/auth");
  }

  async function handleAddPasskey() {
    setAddingPasskey(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optRes = await fetch("/api/auth/passkey/register/options", { method: "POST" });
      const options = await optRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (verRes.ok) {
        router.refresh();
      }
    } catch {
      // User cancelled or error
    } finally {
      setAddingPasskey(false);
    }
  }

  return (
    <div className="pb-8">
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Profile */}
      <section className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Profile
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Phone</label>
            <div className="px-3 py-2.5 bg-gray-50 rounded-xl text-base text-gray-600">
              {user.phone}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      {/* Passkeys */}
      <section className="px-4 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Passkeys
        </h2>
        {passkeys.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">No passkeys added yet.</p>
        )}
        <div className="space-y-2 mb-3">
          {passkeys.map((pk) => (
            <div key={pk.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">{pk.deviceName ?? "Passkey"}</div>
                <div className="text-xs text-gray-400">
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                  {pk.lastUsedAt && ` · Used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddPasskey}
          disabled={addingPasskey}
          className="px-4 py-2.5 border border-blue-600 text-blue-600 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {addingPasskey ? "Setting up…" : "+ Add passkey for this device"}
        </button>
      </section>

      {/* Sign out */}
      <section className="px-4 py-4 space-y-2">
        <button
          onClick={() => handleSignOut(false)}
          className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium"
        >
          Sign out
        </button>
        <button
          onClick={() => handleSignOut(true)}
          className="w-full py-3 text-red-600 text-sm font-medium"
        >
          Sign out everywhere
        </button>
      </section>
    </div>
  );
}
