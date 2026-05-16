"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Props {
  user: { id: string; name: string; email: string | null; phone: string };
  passkeys: Array<{
    id: string;
    deviceName: string | null;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
  teams: Array<{ id: string; name: string }>;
  mutedTeamIds: string[];
}

export default function SettingsClient({ user, passkeys, teams, mutedTeamIds }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [icalUrl, setIcalUrl] = useState<string | null>(null);
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [changingPhone, setChangingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"enter" | "verify">("enter");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [mutedTeams, setMutedTeams] = useState<Set<string>>(new Set(mutedTeamIds));
  const [teamPrefLoading, setTeamPrefLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setPushSupported(true);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub)),
    );
  }, []);

  async function handleSaveProfile(e: FormEvent) {
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

  async function handleGetIcalUrl() {
    setLoadingIcal(true);
    try {
      const res = await fetch("/api/ical");
      if (res.ok) {
        const d = await res.json();
        setIcalUrl(d.url);
      }
    } finally {
      setLoadingIcal(false);
    }
  }

  async function handleSendPhoneOtp() {
    setPhoneSending(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/auth/change-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPhoneError(d.error ?? "Failed to send code");
        return;
      }
      setPhoneStep("verify");
    } finally {
      setPhoneSending(false);
    }
  }

  async function handleVerifyPhone() {
    setPhoneSending(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/auth/change-phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, token: phoneOtp }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPhoneError(d.error ?? "Invalid or expired code");
        return;
      }
      setChangingPhone(false);
      setPhoneStep("enter");
      setNewPhone("");
      setPhoneOtp("");
      router.refresh();
    } finally {
      setPhoneSending(false);
    }
  }

  async function handleTogglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        await existing.unsubscribe();
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        setPushEnabled(false);
        return;
      }

      const keyRes = await fetch("/api/push");
      if (!keyRes.ok) return;
      const { publicKey } = await keyRes.json();

      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setPushEnabled(true);
    } finally {
      setPushLoading(false);
    }
  }

  async function handleToggleTeamMute(teamId: string) {
    setTeamPrefLoading(teamId);
    try {
      const muted = !mutedTeams.has(teamId);
      await fetch("/api/push/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, muted }),
      });
      setMutedTeams((prev) => {
        const next = new Set(prev);
        if (muted) {
          next.add(teamId);
        } else {
          next.delete(teamId);
        }
        return next;
      });
    } finally {
      setTeamPrefLoading(null);
    }
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
    <div className="pb-8 px-[18px] pt-4">
      <h1 className="font-display font-extrabold text-[22px] text-mk-text mb-4">Settings</h1>

      {/* Profile */}
      <section className="mb-5">
        <h2 className="font-display font-extrabold text-[15px] text-mk-text mb-[10px]">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                         focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>
          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                         focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>
          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">Phone</label>
            {changingPhone ? (
              <div className="space-y-2">
                {phoneStep === "enter" ? (
                  <>
                    <input
                      type="tel"
                      placeholder="+1 415 555 0100"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
                    />
                    {phoneError && (
                      <p className="text-xs text-mk-no-text font-body">{phoneError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={phoneSending || !newPhone}
                        className="px-4 py-2 bg-mk-sky text-white rounded-mk-md text-sm font-body font-extrabold disabled:opacity-50"
                      >
                        {phoneSending ? "Sending…" : "Send code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChangingPhone(false);
                          setPhoneError(null);
                          setNewPhone("");
                        }}
                        className="px-4 py-2 text-mk-text-secondary text-sm font-body font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-mk-text-secondary font-body">
                      Enter the sign-in link token sent to {newPhone}
                    </p>
                    <input
                      type="text"
                      placeholder="Paste token from the link"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value)}
                      className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
                    />
                    {phoneError && (
                      <p className="text-xs text-mk-no-text font-body">{phoneError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyPhone}
                        disabled={phoneSending || !phoneOtp}
                        className="px-4 py-2 bg-mk-sky text-white rounded-mk-md text-sm font-body font-extrabold disabled:opacity-50"
                      >
                        {phoneSending ? "Verifying…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoneStep("enter")}
                        className="px-4 py-2 text-mk-text-secondary text-sm font-body font-bold"
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-mk-surface rounded-mk-md text-base text-mk-text-secondary font-body border border-mk-border-card">
                  {user.phone}
                </div>
                <button
                  type="button"
                  onClick={() => setChangingPhone(true)}
                  className="text-sm text-mk-sky whitespace-nowrap font-body font-extrabold"
                >
                  Change
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 bg-mk-sky text-white rounded-mk-md text-sm font-body font-extrabold disabled:opacity-50"
          >
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      {/* Passkeys */}
      <section className="mb-5 pt-5 border-t border-mk-border-card">
        <h2 className="font-display font-extrabold text-[15px] text-mk-text mb-[10px]">Passkeys</h2>
        {passkeys.length === 0 && (
          <p className="text-sm text-mk-text-secondary mb-3 font-body">No passkeys added yet.</p>
        )}
        <div className="space-y-2 mb-3">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-2.5"
            >
              <div>
                <div className="text-sm font-body font-extrabold text-mk-text">
                  {pk.deviceName ?? "Passkey"}
                </div>
                <div className="text-xs text-mk-text-muted font-body">
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                  {pk.lastUsedAt && ` · Used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("Remove this passkey?")) return;
                  await fetch(`/api/auth/passkey/${pk.id}`, { method: "DELETE" });
                  router.refresh();
                }}
                className="text-mk-no-text text-sm px-2 py-1 min-h-0 font-body font-bold"
                style={{ minHeight: "auto" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddPasskey}
          disabled={addingPasskey}
          className="px-4 py-2.5 border-[1.5px] border-mk-sky text-mk-sky rounded-mk-md text-sm font-body font-extrabold disabled:opacity-50"
        >
          {addingPasskey ? "Setting up…" : "+ Add passkey for this device"}
        </button>
      </section>

      {/* Calendar */}
      <section className="mb-5 pt-5 border-t border-mk-border-card">
        <h2 className="font-display font-extrabold text-[15px] text-mk-text mb-1">Calendar feed</h2>
        <p className="text-xs text-mk-text-secondary mb-3 font-body">
          Subscribe to your team events in Apple Calendar, Google Calendar, or any iCal app.
        </p>
        {icalUrl ? (
          <div className="space-y-2">
            <input
              readOnly
              value={icalUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="w-full px-3 py-2 border border-mk-border-card rounded-mk-md text-xs text-mk-text bg-mk-surface select-all font-body"
            />
            <a
              href={`webcal://${icalUrl.replace(/^https?:\/\//, "")}`}
              className="block text-center py-2.5 border-[1.5px] border-mk-sky text-mk-sky rounded-mk-md text-sm font-body font-extrabold"
            >
              Subscribe in Calendar app
            </a>
          </div>
        ) : (
          <button
            onClick={handleGetIcalUrl}
            disabled={loadingIcal}
            className="px-4 py-2.5 border-[1.5px] border-mk-sky text-mk-sky rounded-mk-md text-sm font-body font-extrabold disabled:opacity-50"
          >
            {loadingIcal ? "Loading…" : "Get calendar link"}
          </button>
        )}
      </section>

      {/* Push notifications */}
      {pushSupported && (
        <section className="mb-5 pt-5 border-t border-mk-border-card">
          <h2 className="font-display font-extrabold text-[15px] text-mk-text mb-1">
            Notifications
          </h2>
          <p className="text-xs text-mk-text-secondary mb-3 font-body">
            Get notified about new chat messages and schedule changes.
          </p>
          <button
            onClick={handleTogglePush}
            disabled={pushLoading}
            className={`px-4 py-2.5 rounded-mk-md text-sm font-body font-extrabold disabled:opacity-50 ${
              pushEnabled
                ? "bg-mk-surface text-mk-text border border-mk-border-card"
                : "border-[1.5px] border-mk-sky text-mk-sky"
            }`}
          >
            {pushLoading ? "…" : pushEnabled ? "Disable notifications" : "Enable notifications"}
          </button>

          {pushEnabled && teams.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-body font-bold text-mk-text-secondary mb-2">
                Notify me for:
              </p>
              <div className="space-y-2">
                {teams.map((team) => {
                  const isMuted = mutedTeams.has(team.id);
                  const isLoading = teamPrefLoading === team.id;
                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-2.5"
                    >
                      <span className="text-sm text-mk-text font-body font-extrabold">
                        {team.name}
                      </span>
                      <button
                        onClick={() => handleToggleTeamMute(team.id)}
                        disabled={isLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          disabled:opacity-50 ${isMuted ? "bg-mk-border" : "bg-mk-sky"}`}
                        role="switch"
                        aria-checked={!isMuted}
                        aria-label={`Notifications for ${team.name}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow
                            transition-transform ${isMuted ? "translate-x-1" : "translate-x-6"}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sign out */}
      <section className="mb-5 pt-5 border-t border-mk-border-card space-y-2">
        <button
          onClick={() => handleSignOut(false)}
          className="w-full py-3 border-[1.5px] border-mk-border-card text-mk-text rounded-mk-md text-sm font-body font-extrabold bg-mk-bg"
        >
          Sign out
        </button>
        <button
          onClick={() => handleSignOut(true)}
          className="w-full py-3 text-mk-no-text text-sm font-body font-extrabold"
        >
          Sign out everywhere
        </button>
      </section>

      {/* Delete account */}
      <section className="pt-5 border-t border-mk-border-card space-y-2">
        <h2 className="font-display font-extrabold text-[15px] text-mk-no-text mb-1">
          Danger zone
        </h2>
        <p className="text-xs text-mk-text-secondary font-body">
          Permanently deletes your account. Your chat messages will be anonymized. This cannot be
          undone.
        </p>
        <button
          onClick={async () => {
            const typed = prompt('Type "delete my account" to confirm');
            if (typed !== "delete my account") return;
            const res = await fetch("/api/me", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm: "delete my account" }),
            });
            if (res.ok) router.push("/auth");
          }}
          className="w-full py-3 border-[1.5px] border-mk-no-text/40 text-mk-no-text rounded-mk-md text-sm font-body font-extrabold bg-mk-bg"
        >
          Delete my account
        </button>
      </section>
    </div>
  );
}
