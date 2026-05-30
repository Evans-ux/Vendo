'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubAccountUser {
  id: string;
  businessName: string;
  user: {
    email: string;
    name: string | null;
  };
  kycStatus: string;
  flwSubaccountId: string | null;
  bankCode: string | null;
  accountNumber: string | null;
}

export default function SubAccountMonitor() {
  const [users, setUsers] = useState<SubAccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/subaccounts');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load sub-account data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRetry = async (userId: string) => {
    setRetryingId(userId);
    try {
      const res = await fetch('/api/subaccounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('Sub-account created successfully');
        fetchUsers();
      } else {
        throw new Error(result.error || 'Failed to create sub-account');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 bg-brand-charcoal min-h-screen text-white">
      <Card className="bg-gray-900 border-gray-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-brand-orange">Sub-Account Monitoring</CardTitle>
          <p className="text-gray-400">Manage and retry Flutterwave sub-account creations for approved suppliers.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="p-4">Business</th>
                  <th className="p-4">KYC Status</th>
                  <th className="p-4">Bank Details</th>
                  <th className="p-4">FW Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{user.businessName}</div>
                      <div className="text-sm text-gray-500">{user.user.email}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.kycStatus === 'APPROVED' ? 'default' : 'secondary'}>
                        {user.kycStatus}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm">
                      {user.bankCode && user.accountNumber ? (
                        <span className="flex items-center text-green-500 gap-1">
                          <CheckCircle2 size={14} /> Ready
                        </span>
                      ) : (
                        <span className="flex items-center text-red-400 gap-1">
                          <AlertCircle size={14} /> Missing Data
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge className={user.flwSubaccountId ? 'bg-green-600' : 'bg-yellow-600'}>
                        {user.flwSubaccountId ? 'ACTIVE' : 'NOT CREATED'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        onClick={() => handleRetry(user.id)}
                        disabled={retryingId === user.id || !!user.flwSubaccountId || !user.bankCode}
                        className="bg-brand-orange hover:bg-orange-600"
                      >
                        {retryingId === user.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Retry Create
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}