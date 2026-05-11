"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FormEvent } from "react";

interface Message {
  id: string;
  senderName: string;
  body: string;
  sentAt: string;
  isMe: boolean;
}

interface Props {
  teamId: string;
  userId: string;
  userName: string;
  initialMessages: Message[];
  lastReadMessageId?: string | null;
}

function linkify(text: string): string {
  return text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline text-blue-600">$1</a>',
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatClient({
  teamId,
  userId,
  userName,
  initialMessages,
  lastReadMessageId,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the ID boundary where new (unread) messages begin
  const newMessageDividerAfter = lastReadMessageId ?? initialMessages.at(-1)?.id ?? null;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark latest message as read whenever messages change
  useEffect(() => {
    const last = messages.at(-1);
    if (last && !last.id.startsWith("opt-")) {
      fetch(`/api/teams/${teamId}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: last.id }),
      }).catch(() => {});
    }
  }, [messages, teamId]);

  // Ref to track the latest message ID for missed-message reconciliation
  const latestMessageIdRef = useRef<string | null>(initialMessages.at(-1)?.id ?? null);
  useEffect(() => {
    const last = messages.filter((m) => !m.id.startsWith("opt-")).at(-1);
    if (last) latestMessageIdRef.current = last.id;
  }, [messages]);

  // Poll for missed messages since last known ID (called on reconnect)
  async function fetchMissedMessages() {
    const since = latestMessageIdRef.current;
    if (!since) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/messages?since=${encodeURIComponent(since)}`);
      if (!res.ok) return;
      const missed: Array<Message & { senderUserId: string }> = await res.json();
      if (missed.length === 0) return;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = missed
          .filter((m) => !existingIds.has(m.id))
          .map((m) => ({ ...m, isMe: m.senderUserId === userId }));
        return [...prev, ...newMsgs];
      });
    } catch {
      // ignore
    }
  }

  // WebSocket connection with exponential backoff reconnect
  useEffect(() => {
    let attempts = 0;

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws?team=${teamId}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as Message & { senderUserId: string };
          setMessages((prev) => [...prev, { ...msg, isMe: msg.senderUserId === userId }]);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onopen = () => {
        if (attempts > 0) {
          // Reconnected — fetch any messages we missed while disconnected
          fetchMissedMessages();
        }
        attempts = 0;
      };

      ws.onclose = () => {
        const delay = Math.min(1000 * 2 ** attempts, 30000);
        attempts++;
        reconnectTimeout.current = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [teamId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;

    const text = body.trim();
    setBody("");
    setSending(true);

    // Optimistic message
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      senderName: userName,
      body: text,
      sentAt: new Date().toISOString(),
      isMe: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setBody(text); // Restore draft
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">No messages yet. Say hi! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isFirstUnread =
            newMessageDividerAfter &&
            i > 0 &&
            messages[i - 1].id === newMessageDividerAfter &&
            msg.id !== newMessageDividerAfter &&
            !msg.id.startsWith("opt-");
          return (
            <div key={msg.id}>
              {isFirstUnread && (
                <div className="flex items-center gap-2 my-3 px-2">
                  <div className="flex-1 h-px bg-blue-200" />
                  <span className="text-xs text-blue-500 font-medium shrink-0">New messages</span>
                  <div className="flex-1 h-px bg-blue-200" />
                </div>
              )}
              <div className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] ${msg.isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                >
                  {!msg.isMe && (
                    <span className="text-xs text-gray-500 px-1">{msg.senderName}</span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm chat-body ${
                      msg.isMe
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-900 rounded-bl-sm"
                    }`}
                    dangerouslySetInnerHTML={{ __html: linkify(msg.body) }}
                  />
                  <span className="text-[11px] text-gray-400 px-1">{formatTime(msg.sentAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 p-3 border-t border-gray-200 bg-white"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as FormEvent);
            }
          }}
          placeholder="Message…"
          rows={1}
          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-2xl text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center
                     disabled:opacity-50 shrink-0 min-h-[40px] min-w-[40px]"
          aria-label="Send"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
