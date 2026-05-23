"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Shield, Bell, Key, UserCog, Database } from "lucide-react";

interface AdminData {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export default function SettingsClient({ initialData }: { initialData: AdminData }) {
  const router = useRouter();
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Typically you'd send `formData` to a Next.js action or API route here.
      // await updateAdminProfile(formData);
      await new Promise(res => setTimeout(res, 1000)); // Simulate save
      toast.success("Settings updated successfully!");
    } catch {
      toast.error("Failed to save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Configure global platform behaviours</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:flex gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex-shrink-0 mb-8 md:mb-0 space-y-1">
          {[
            { id: "profile", label: "Admin Profile", icon: UserCog },
            { id: "security", label: "Security & Passwords", icon: Key },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "platform", label: "Platform Rules", icon: Shield },
            { id: "database", label: "Database Config", icon: Database },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-orange/10 text-brand-orange"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content Pane */}
        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm p-6 lg:p-10">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Admin Profile</h2>
                <p className="text-sm text-muted-foreground mt-1">Update your administrative contact details.</p>
              </div>
              <hr className="border-border" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-brand-orange focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Admin emails cannot be changed directly.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-brand-orange focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Role</label>
                  <input
                    type="text"
                    disabled
                    value={formData.role}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab !== "profile" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground capitalize">{activeTab} Settings</h2>
              <p className="text-muted-foreground text-sm">This module is currently disabled in the staging environment for security reasons.</p>
            </div>
          )}

          <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-border">
            <button className="px-5 py-2 rounded-lg font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || activeTab !== "profile"}
              className="px-6 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
