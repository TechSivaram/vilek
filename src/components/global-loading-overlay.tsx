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
    return () => {
      window.removeEventListener("vilek:loading-start", start);
      window.removeEventListener("vilek:loading-end", end);
    };
  }, []);

  if (fetching + mutating + manualRequests === 0) return null;

  return (
    <div className="global-loading-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div className="global-loading-card">
        <span className="global-loading-spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    </div>
  );
}
