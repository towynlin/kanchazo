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
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      {status === "verifying" && <p className="text-gray-500">Verifying your new number…</p>}
      {status === "success" && (
        <>
          <div className="text-4xl mb-3">✓</div>
          <p className="text-lg font-semibold text-green-700">Phone number updated!</p>
          <p className="text-sm text-gray-500 mt-1">Redirecting to settings…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-4xl mb-3">⚠</div>
          <p className="text-base font-medium text-red-700">{errorMsg}</p>
          <button
            onClick={() => router.push("/settings")}
            className="mt-4 px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
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
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400">Loading…</p>
        </div>
      }
    >
      <VerifyPhoneContent />
    </Suspense>
  );
}
