"use client";
import { useCallback, useEffect, useState } from "react";
import "./claim-conversation.css";
type Message = {
  id: string;
  claimId: string;
  comment: string;
  parentCommentId: string | null;
  createdAt: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
};
const dateLabel = (v: string) =>
  new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export function ClaimConversation({ claimId }: { claimId: string }) {
  const [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [replyTo, setReplyTo] = useState<Message | null>(null),
    [hasMore, setHasMore] = useState(false),
    [nextBefore, setNextBefore] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [sending, setSending] = useState(false),
    [error, setError] = useState(""),
    [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const refresh = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const r = await fetch(`/api/claims/${encodeURIComponent(claimId)}/conversation?limit=100`, {
          cache: "no-store",
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Unable to load conversation.");
        setMessages((cur) => {
          const m = new Map(cur.map((x) => [x.id, x]));
          for (const x of d.messages as Message[]) m.set(x.id, x);
          return [...m.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        });
        setHasMore(!!d.hasMore);
        setNextBefore(d.nextBefore ?? null);
        setLastRefreshed(new Date());
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to refresh conversation.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [claimId],
  );
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const loadOlder = async () => {
    if (!nextBefore) return;
    setRefreshing(true);
    try {
      const r = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/conversation?limit=100&before=${encodeURIComponent(nextBefore)}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to load older messages.");
      setMessages((cur) =>
        [...(d.messages as Message[]), ...cur].filter(
          (x, i, a) => a.findIndex((y) => y.id === x.id) === i,
        ),
      );
      setHasMore(!!d.hasMore);
      setNextBefore(d.nextBefore ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load older messages.");
    } finally {
      setRefreshing(false);
    }
  };
  const send = async () => {
    const value = draft.trim();
    if (!value || sending) return;
    setSending(true);
    setError("");
    try {
      const r = await fetch(`/api/claims/${encodeURIComponent(claimId)}/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: value,
          ...(replyTo ? { parentCommentId: replyTo.id } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Message could not be sent.");
      setDraft("");
      setReplyTo(null);
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };
  const orderedMessages = [...messages].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const parentFor = (m: Message) =>
    m.parentCommentId ? messages.find((x) => x.id === m.parentCommentId) : undefined;
  const render = (m: Message) => (
    <article
      className={`claim-conversation__message${m.parentCommentId ? " is-reply" : ""}`}
      key={m.id}
    >
      <p>{m.comment}</p>
      <div className="claim-conversation__meta">
        <strong>
          {m.firstName} {m.lastName}
        </strong>
        <span>{dateLabel(m.createdAt)}</span>
        {parentFor(m) && (
          <span className="claim-conversation__reply-context">
            ↳ Reply to {parentFor(m)!.firstName} {parentFor(m)!.lastName}
          </span>
        )}
      </div>
      <button type="button" className="claim-conversation__reply" onClick={() => setReplyTo(m)}>
        Reply
      </button>
    </article>
  );
  return (
    <section className="claim-conversation" aria-label="Claim conversation">
      <header className="claim-conversation__header">
        <div>
          <h3>Full claim conversation</h3>
          <p>All messages and replies from authorised participants on this claim</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          disabled={refreshing}
          aria-label="Refresh conversation"
        >
          ↻ {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>
      <div className="claim-conversation__updated">
        {lastRefreshed
          ? `Last refreshed ${lastRefreshed.toLocaleTimeString()}`
          : "Loading conversation…"}{" "}
        · Auto-refresh every 15 seconds
      </div>
      {hasMore && (
        <button
          type="button"
          className="claim-conversation__older"
          onClick={() => void loadOlder()}
          disabled={refreshing}
        >
          Load older messages
        </button>
      )}
      {loading && messages.length === 0 ? (
        <p className="claim-conversation__empty">Loading messages…</p>
      ) : orderedMessages.length === 0 ? (
        <p className="claim-conversation__empty">No messages yet. Start the conversation.</p>
      ) : (
        <div className="claim-conversation__list">{orderedMessages.map((x) => render(x))}</div>
      )}
      {error && (
        <p className="claim-conversation__error" role="alert">
          {error}
        </p>
      )}
      {replyTo && (
        <div className="claim-conversation__replying">
          Replying to {replyTo.firstName} {replyTo.lastName}
          <button type="button" onClick={() => setReplyTo(null)}>
            Cancel
          </button>
        </div>
      )}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Write a message to everyone involved in this claim…"
        aria-label="New claim message"
      />
      <footer>
        <span>{draft.length}/2000</span>
        <button type="button" onClick={() => void send()} disabled={sending || !draft.trim()}>
          {sending ? "Sending…" : "Send message"}
        </button>
      </footer>
    </section>
  );
}
