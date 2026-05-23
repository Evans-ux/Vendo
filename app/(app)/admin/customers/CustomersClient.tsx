"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Search, User, Mail, Phone, Calendar, ShoppingBag, ShieldAlert, Trash2, ShieldCheck, MoreVertical } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toggleUserRole, deleteUserAccount } from "@/app/actions/admin";

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  telegramId: string;
  ordersCount: number;
  totalSpent: number;
  joined: string;
  role: string;
}

export default function CustomersClient({ customers }: { customers: CustomerData[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "MAKE_ADMIN" | "REMOVE_ADMIN" | "DELETE_USER" | null;
    targetUserId: string | null;
    targetUserName: string;
  }>({
    isOpen: false,
    type: null,
    targetUserId: null,
    targetUserName: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleActionClick = (type: "MAKE_ADMIN" | "REMOVE_ADMIN" | "DELETE_USER", userId: string, userName: string) => {
    setModalState({
      isOpen: true,
      type,
      targetUserId: userId,
      targetUserName: userName
    });
  };

  const handleConfirmAction = async () => {
    if (!modalState.targetUserId || !modalState.type) return;
    setIsLoading(true);

    const toastId = toast.loading("Processing action...");

    try {
      if (modalState.type === "MAKE_ADMIN") {
        const res = await toggleUserRole(modalState.targetUserId, "ADMIN");
        if (res.success) toast.success(`${modalState.targetUserName} is now an Admin!`, { id: toastId });
        else throw new Error(res.error);
      } 
      else if (modalState.type === "REMOVE_ADMIN") {
        const res = await toggleUserRole(modalState.targetUserId, "CUSTOMER");
        if (res.success) toast.success(`Admin revoked from ${modalState.targetUserName}.`, { id: toastId });
        else throw new Error(res.error);
      }
      else if (modalState.type === "DELETE_USER") {
        const res = await deleteUserAccount(modalState.targetUserId);
        if (res.success) toast.success(`User ${modalState.targetUserName} permanently deleted.`, { id: toastId });
        else throw new Error(res.error);
        router.refresh(); // Refresh page to remove deleted row
      }
    } catch (error: any) {
      toast.error(error.message || "Action failed to execute", { id: toastId });
    } finally {
      setIsLoading(false);
      setModalState(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Resolve Modal texts dynamically
  const getModalText = () => {
    switch (modalState.type) {
      case "MAKE_ADMIN":
        return {
          title: "Grant Admin Privileges?",
          desc: `Are you sure you want to promote ${modalState.targetUserName} to an Admin? They will have full access to view orders, approve suppliers, and modify system settings.`,
          btn: "Yes, Make Admin",
          destructive: false
        };
      case "REMOVE_ADMIN":
        return {
          title: "Revoke Admin Privileges?",
          desc: `Are you sure you want to revoke Admin access from ${modalState.targetUserName}? They will become a standard customer moving forward.`,
          btn: "Revoke Admin",
          destructive: true
        };
      case "DELETE_USER":
        return {
          title: "Permanently Delete User?",
          desc: `WARNING: Deleting ${modalState.targetUserName} cannot be undone. This will permanently wipe their account, all order history, and delete their supplier profile (if they have one).`,
          btn: "Yes, Delete Permanently",
          destructive: true
        };
      default: return { title: "", desc: "", btn: "", destructive: false };
    }
  };

  const currentModal = getModalText();

  return (
    <div className="min-h-screen bg-background">
      <ConfirmModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={currentModal.title}
        description={currentModal.desc}
        confirmText={currentModal.btn}
        isDestructive={currentModal.destructive}
      />

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
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage platform buyers, admins, and users</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
          <div className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm text-foreground font-medium">
            Total Users: {customers.length}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden pb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">User Details</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Activity</th>
                  <th className="px-6 py-4 font-medium text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border pt-4">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            {customer.role === "ADMIN" ? <ShieldCheck className="w-4 h-4 text-purple-500" /> : <User className="w-4 h-4 text-brand-orange" />}
                            {customer.name}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1 flex gap-2">
                            ID: {customer.telegramId}
                            {customer.role === "ADMIN" && <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">ADMIN</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1 text-xs">
                          <span className="text-foreground flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {customer.email}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" />
                            {customer.phone}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                            {customer.ordersCount} Orders
                          </span>
                          <span className="text-xs text-muted-foreground mt-1 text-green-600 dark:text-green-400 font-medium">
                            Spent: ₦{customer.totalSpent.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {customer.role === "ADMIN" ? (
                            <button 
                              onClick={() => handleActionClick("REMOVE_ADMIN", customer.id, customer.name)}
                              disabled={isLoading}
                              className="px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
                            >
                              Revoke Admin
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleActionClick("MAKE_ADMIN", customer.id, customer.name)}
                              disabled={isLoading}
                              className="px-3 py-1.5 text-xs font-semibold text-brand-orange hover:bg-brand-orange/10 rounded-lg transition-colors border border-brand-orange/20"
                            >
                              Make Admin
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleActionClick("DELETE_USER", customer.id, customer.name)}
                            disabled={isLoading}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Permanently Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
