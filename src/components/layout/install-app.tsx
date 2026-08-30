"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  installable: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  isIOS: boolean;
}

function useInstallPrompt(): InstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream,
    );

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Ignore registration failures (e.g. unsupported or insecure context).
        });
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return { installable: !!deferredPrompt || isIOS, deferredPrompt, isIOS };
}

function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsStandalone(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isStandalone;
}

/** Mobile floating "Install" pill (hidden on desktop). */
export function InstallApp() {
  const isStandalone = useStandalone();
  const { installable, deferredPrompt, isIOS } = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (isStandalone || !installable) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        // will be hidden once standalone metadata kicks in
      }
    } else if (isIOS) {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-40">
      <button
        type="button"
        onClick={handleInstall}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
        aria-label="Install app"
      >
        <Download className="h-4 w-4" />
        Install
      </button>

      {isIOS && showIosHelp && (
        <div className="absolute bottom-14 left-0 z-50 w-64 rounded-lg border border-border bg-background p-4 text-xs text-muted-foreground shadow-xl">
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="font-medium text-foreground">Add SpendGuard to your phone</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Tap the Share button in Safari.</li>
            <li>Choose "Add to Home Screen".</li>
            <li>Tap "Add" in the top right.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

/** Desktop "Install app" full-width button (shown inside the sidebar, lg+). */
export function SidebarInstallApp() {
  const isStandalone = useStandalone();
  const { installable, deferredPrompt, isIOS } = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (isStandalone || !installable) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
    } else if (isIOS) {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleInstall}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Download className="h-4 w-4" />
        Install app
      </button>
      {isIOS && showIosHelp && (
        <div
          className={cn(
            "mt-2 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground",
          )}
        >
          <p className="font-medium text-foreground">To install on iOS:</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>Tap the Share button in Safari.</li>
            <li>Choose "Add to Home Screen".</li>
          </ol>
        </div>
      )}
    </div>
  );
}
