"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendNotification } from "@/app/actions/admin";

interface Notification {
  id: string;
  title: string;
  message: string;
  target: "SUPPLIER" | "ALL";
  hasRead: boolean;
  createdAt: string;
  supplierName: string | null;
}

interface Supplier {
  id: string;
  businessName: string;
}

export default function NotificationsClient({
  notifications,
  suppliers,
}: {
  notifications: Notification[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    supplierId: "", // empty = broadcast
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSending(true);
    const result = await sendNotification({
      title: form.title.trim(),
      message: form.message.trim(),
      supplierId: form.supplierId || undefined,
    });
    if (result.success) {
      toast.success("Sent", { description: result.message });
      setForm({ title: "", message: "", supplierId: "" });
      router.refresh();
    } else {
      toast.error("Failed", { description: result.error });
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">Send messages to suppliers</p>
          </div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Compose */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-5">Compose Notification</h2>
          <form onSubmit={handleSend} className="space-y-4">
            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Recipient
              </label>
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">📢 Broadcast to ALL suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName}
                  </option>
                ))}
              </select>
              {!form.supplierId && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ This will be sent to every supplier on the platform.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Platform Maintenance Notice"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Write your message here…"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {sending ? "Sending…" : form.supplierId ? "Send to Supplier" : "Broadcast to All"}
            </button>
          </form>
        </div>

        {/* History */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">
            Sent Notifications ({notifications.length})
          </h2>
          {notifications.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center">
              <div className="text-5xl mb-3">🔔</div>
              <p className="text-muted-foreground">No notifications sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                    {n.target === "ALL" ? "📢" : "✉️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{n.title}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          n.target === "ALL"
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {n.target === "ALL" ? "Broadcast" : n.supplierName ?? "Supplier"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(n.createdAt).toLocaleDateString("en-NG", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
