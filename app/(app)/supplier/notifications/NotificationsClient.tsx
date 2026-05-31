"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/supplier";

interface Notification {
  id: string;
  title: string;
  message: string;
  hasRead: boolean;
  target: "SUPPLIER" | "ALL";
  createdAt: string;
}

export default function NotificationsClient({
  notifications,
}: {
  notifications: Notification[];
}) {
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.hasRead).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const result = await markAllNotificationsRead();
    if (result.success) {
      toast.success("All notifications marked as read");
      router.refresh();
    } else {
      toast.error("Failed", { description: result.error });
    }
    setMarkingAll(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {markingAll ? "Marking…" : "Mark all read"}
              </button>
            )}
            <button
              onClick={() => router.push("/supplier/dashboard")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {notifications.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No notifications yet</h3>
            <p className="text-muted-foreground text-sm">
              Messages from the Vendo team will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-card rounded-xl border transition-all ${
                  n.hasRead ? "border-border" : "border-primary/30 bg-primary/5"
                }`}
              >
                <button
                  className="w-full text-left p-4"
                  onClick={() => {
                    setExpanded(expanded === n.id ? null : n.id);
                    if (!n.hasRead) handleMarkRead(n.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        n.hasRead ? "bg-muted-foreground/30" : "bg-primary"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${n.hasRead ? "text-foreground" : "text-foreground"}`}>
                          {n.title}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(n.createdAt).toLocaleDateString("en-NG", {
                            month: "short", day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 ${expanded === n.id ? "text-foreground" : "text-muted-foreground line-clamp-1"}`}>
                        {n.message}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
