"use client";

import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export function GlobalLoadingOverlay() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const [manualRequests, setManualRequests] = useState(0);

  useEffect(() => {
    const start = () => setManualRequests((count) => count + 1);
    const end = () => setManualRequests((count) => Math.max(0, count - 1));
    window.addEventListener("vilek:loading-start", start);
    window.addEventListener("vilek:loading-end", end);

    // Show the global loader for every browser request to an application API,
    // including lazy-loaded detail requests and APIs that do not use React Query.
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (
      ...args: Parameters<typeof fetch>
    ): Promise<Response> => {
      const request = args[0];
      const rawUrl =
        typeof request === "string" || request instanceof URL
          ? String(request)
          : request.url;
      let isApiRequest = false;
      try {
        isApiRequest = new URL(
          rawUrl,
          window.location.origin,
        ).pathname.startsWith("/api/");
      } catch {
        isApiRequest = rawUrl.startsWith("/api/");
      }

      if (isApiRequest) window.dispatchEvent(new Event("vilek:loading-start"));
      try {
        return await originalFetch(...args);
      } finally {
        if (isApiRequest) window.dispatchEvent(new Event("vilek:loading-end"));
      }
    };

    return () => {
      window.removeEventListener("vilek:loading-start", start);
      window.removeEventListener("vilek:loading-end", end);
      window.fetch = originalFetch;
    };
  }, []);

  if (fetching + mutating + manualRequests === 0) return null;

  return (
    <div
      className="global-loading-overlay"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="global-loading-card">
        <span className="global-loading-spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    </div>
  );
}
