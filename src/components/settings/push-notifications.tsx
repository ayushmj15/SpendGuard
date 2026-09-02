"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  enablePushNotifications,
  disablePushNotifications,
  getNotificationPermissionState,
  isPushSupported,
  isPushSubscribed,
} from "@/lib/push-client";

/**
 * Manage Web Push notifications for reminders ("Did you just spend? Log it now").
 */
export function PushNotificationsToggle() {
  const [supported] = React.useState(() => isPushSupported());
  const [enabled, setEnabled] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [busy, setBusy] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const perm = await getNotificationPermissionState();
      if (!mounted) return;
      setPermission(perm);
      const subscribed = perm === "granted" && (await isPushSubscribed());
      if (!mounted) return;
      setEnabled(subscribed);
      setChecked(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!supported) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        Push notifications are not supported on this device or browser.
      </p>
    );
  }

  const handleToggle = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) {
        await enablePushNotifications();
        setEnabled(true);
        setPermission("granted");
        toast.success("Notifications enabled. You'll get spending reminders.");
      } else {
        await disablePushNotifications();
        setEnabled(false);
        toast.success("Notifications disabled.");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update notifications.";
      toast.error(msg);
      if (value) setEnabled(false);
    } finally {
      setBusy(false);
    }
  };

  const needPermissionTap =
    !enabled && checked && permission !== "granted";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            {enabled ? (
              <BellRing className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            {enabled ? "Notifications enabled" : "Notifications off"}
          </p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? "You'll receive reminders to log expenses you may have missed."
              : "Turn on reminders so SpendGuard can nudge you to track spending after a payment."}
          </p>
        </div>
        <Button
          size="sm"
          variant={enabled ? "outline" : "default"}
          onClick={() => void handleToggle(!enabled)}
          disabled={busy || !checked}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {enabled ? "Turn off" : "Turn on"}
        </Button>
      </div>

      {!enabled && !needPermissionTap && (
        <p className="text-xs text-muted-foreground">
          Reminders are sent as push notifications to your device. You can change
          this anytime here.
        </p>
      )}
    </div>
  );
}
