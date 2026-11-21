"use client";

import { useCallback, useEffect, useState } from "react";

type Message = {
  id: string;
  comment: string;
  parentCommentId: string | null;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
};

function stamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function ClaimConversation({ claimId }: { claimId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/approver/claims/${encodeURIComponent(claimId)}/comments`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load conversation.");
      setMessages(Array.isArray(data.comments) ? data.comments : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load conversation.");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function send() {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/approver/claims/${encodeURIComponent(claimId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: draft.trim(),
          ...(replyTo ? { parentCommentId: replyTo } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message could not be sent.");
      setDraft("");
      setReplyTo(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="approver-conversation" aria-label="Claim conversation">
      <div className="approver-conversation__heading">
        <div>
          <span className="approver-section__eyebrow">CLAIM COMMUNICATION</span>
          <h4>Conversation</h4>
        </div>
        <span>
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
      </div>
      {loading ? (
        <p className="approver-conversation__empty">Loading conversation…</p>
      ) : messages.length === 0 ? (
        <p className="approver-conversation__empty">
          No messages yet. Start the conversation with the crew member.
        </p>
      ) : (
        <div className="approver-conversation__messages">
          {messages
            .filter((message) => !message.parentCommentId)
            .map((message) => (
              <div className="approver-conversation__thread" key={message.id}>
                <article className="approver-conversation__message">
                  <div>
                    <strong>
                      {message.authorFirstName} {message.authorLastName}
                    </strong>
                    <time>{stamp(message.createdAt)}</time>
                  </div>
                  <p>{message.comment}</p>
                  <button type="button" onClick={() => setReplyTo(message.id)}>
                    Reply
                  </button>
                </article>
                {messages
                  .filter((reply) => reply.parentCommentId === message.id)
                  .map((reply) => (
                    <article
                      className="approver-conversation__message approver-conversation__message--reply"
                      key={reply.id}
                    >
                      <div>
                        <strong>
                          {reply.authorFirstName} {reply.authorLastName}
                        </strong>
                        <time>{stamp(reply.createdAt)}</time>
                      </div>
                      <p>{reply.comment}</p>
                      <button type="button" onClick={() => setReplyTo(reply.id)}>
                        Reply
                      </button>
                    </article>
                  ))}
              </div>
            ))}
        </div>
      )}
      {replyTo && (
        <div className="approver-conversation__replying">
          Replying to a message{" "}
          <button type="button" onClick={() => setReplyTo(null)}>
            Cancel
          </button>
        </div>
      )}
      <label className="approver-conversation__composer">
        <span className="sr-only">Write a message</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message to the crew member…"
        />
      </label>
      {error && (
        <p className="approver-conversation__error" role="alert">
          {error}
        </p>
      )}
      <div className="approver-conversation__footer">
        <span>{draft.length}/2000</span>
        <button type="button" disabled={!draft.trim() || sending} onClick={() => void send()}>
          {sending ? "Sending…" : "Send message"}
        </button>
      </div>
      <p className="approver-conversation__note">
        Messaging remains available after a claim is approved, rejected or settled. Messages do not
        change the claim decision.
      </p>
    </section>
  );
}

export function HistoryClaimConversation({ claimId }: { claimId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="approver-history-conversation">
      <button
        type="button"
        className="approver-history-conversation__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide conversation" : "View conversation"}
      </button>
      {open && <ClaimConversation claimId={claimId} />}
    </div>
  );
}
