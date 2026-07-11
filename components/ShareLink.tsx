"use client";

import { useState } from "react";

interface Props {
  url: string;
  shareText?: string; // message body used with the native share sheet
}

export default function ShareLink({ url, shareText }: Props) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    try {
      await navigator.share({ text: shareText ? `${shareText} ${url}` : url });
    } catch {
      // user dismissed the share sheet
    }
  }

  return (
    <div className="space-y-2">
      <input
        readOnly
        value={url}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        className="w-full px-3 py-2 border border-mk-border-card rounded-mk-md text-xs text-mk-text bg-mk-surface select-all font-body"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 py-2.5 border-[1.5px] border-mk-sky text-mk-sky rounded-mk-md text-sm font-body font-extrabold"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 py-2.5 bg-mk-sky text-white rounded-mk-md text-sm font-body font-extrabold"
          >
            Share…
          </button>
        )}
      </div>
    </div>
  );
}
