"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaRuntime() {
  const pathname = usePathname();
  const showInstallUi = pathname === "/login";
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [hideIosInstall, setHideIosInstall] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    const userAgentIsIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsIos(userAgentIsIos && !isStandalone);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    // Avoid controlling the Next.js development server with a stale worker.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      let disposed = false;

      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((result) => {
          if (disposed) return;
          if (result.waiting && navigator.serviceWorker.controller) {
            waitingWorker.current = result.waiting;
            setUpdateReady(true);
          }

          result.addEventListener("updatefound", () => {
            const installing = result.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                waitingWorker.current = result.waiting;
                setUpdateReady(Boolean(result.waiting));
              }
            });
          });
        })
        .catch((error: unknown) => {
          console.error("ViLek service worker registration failed:", error);
        });

      const handleControllerChange = () => {
        if (refreshing.current) return;
        refreshing.current = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      return () => {
        disposed = true;
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
        window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
        window.removeEventListener("appinstalled", handleInstalled);
      };
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
    } catch (error) {
      console.error("ViLek installation prompt failed:", error);
    }
  };

  const applyUpdate = () => {
    waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
    setUpdateReady(false);
  };

  return (
    <>
      {isOffline ? (
        <div className="pwa-network-banner" role="status">
          <span className="pwa-status-dot" />
          You're offline. ViLek data and actions require a connection.
        </div>
      ) : null}

      {updateReady ? (
        <div className="pwa-update-banner" role="status">
          <span>A ViLek update is ready.</span>
          <button type="button" onClick={applyUpdate}>
            Refresh
          </button>
        </div>
      ) : null}

      {showInstallUi && installPrompt ? (
        <div className="pwa-install-card" role="region" aria-label="Install ViLek">
          <div className="pwa-install-copy">
            <strong>Install ViLek</strong>
            <span>Add ViLek to your home screen for quick access.</span>
          </div>
          <button type="button" onClick={install}>
            Install
          </button>
          <button
            className="pwa-dismiss"
            type="button"
            aria-label="Dismiss install prompt"
            onClick={() => setInstallPrompt(null)}
          >
            ×
          </button>
        </div>
      ) : showInstallUi && isIos && !hideIosInstall ? (
        <div className="pwa-install-card pwa-install-card--ios">
          <div className="pwa-install-copy">
            <strong>Install ViLek</strong>
            <span>Add it to your Home Screen from Safari.</span>
          </div>
          <button type="button" onClick={() => setShowIosHelp((value) => !value)}>
            How to install
          </button>
          <button
            className="pwa-dismiss"
            type="button"
            aria-label="Dismiss install instructions"
            onClick={() => setHideIosInstall(true)}
          >
            ×
          </button>
          {showIosHelp ? (
            <p className="pwa-ios-help">
              In Safari, tap the Share button, choose “Add to Home Screen”, then tap “Add”.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
