export default function Loading() {
  return (
    <div className="route-loading-screen" role="status" aria-live="polite">
      <span className="global-loading-spinner" aria-hidden="true" />
      <span>Loading page…</span>
    </div>
  );
}
