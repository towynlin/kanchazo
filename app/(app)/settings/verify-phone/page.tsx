"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const phone = searchParams.get("phone");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token || !phone) {
      setStatus("error");
      setErrorMsg("Invalid link.");
      return;
    }
    fetch("/api/auth/change-phone", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => router.push("/settings"), 1500);
        } else {
          const d = await res.json();
          setStatus("error");
          setErrorMsg(d.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Network error.");
      });
  }, [token, phone, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-mk-bg">
      {status === "verifying" && (
        <p className="text-mk-text-secondary font-body">Verifying your new number…</p>
      )}
      {status === "success" && (
        <>
          <div className="text-4xl mb-3">✓</div>
          <p className="font-display font-extrabold text-[18px] text-mk-yes-text">
            Phone number updated!
          </p>
          <p className="text-sm text-mk-text-secondary mt-1 font-body">Redirecting to settings…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-4xl mb-3">⚠</div>
          <p className="font-display font-extrabold text-[16px] text-mk-no-text">{errorMsg}</p>
          <button
            onClick={() => router.push("/settings")}
            className="mt-4 px-4 py-2.5 border border-mk-border-card rounded-mk-md text-sm font-body font-bold text-mk-text"
          >
            Back to settings
          </button>
        </>
      )}
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-mk-bg">
          <p className="text-mk-text-muted font-body">Loading…</p>
        </div>
      }
    >
      <VerifyPhoneContent />
    </Suspense>
  );
}
