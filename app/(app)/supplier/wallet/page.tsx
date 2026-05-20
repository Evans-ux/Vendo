import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import WalletClient from "./WalletClient";

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { supplier: true },
  });

  if (dbUser?.role === "ADMIN") redirect("/admin/dashboard");
  if (!dbUser?.supplier) redirect("/supplier/onboard");

  const s = dbUser.supplier;

  // Last 20 earnings transactions
  const transactions = await prisma.earningsTransaction.findMany({
    where: { supplierId: s.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Last 10 withdrawals
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { supplierId: s.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Pending balance (not yet available)
  const pendingBalance = await prisma.earningsTransaction.aggregate({
    where: { supplierId: s.id, status: "PENDING", type: "CREDIT" },
    _sum: { amount: true },
  });

  return (
    <WalletClient
      walletBalance={Number(s.walletBalance)}
      totalEarned={Number(s.totalEarned)}
      pendingBalance={Number(pendingBalance._sum.amount ?? 0)}
      hasPin={!!s.withdrawalPin}
      bankName={s.bankName}
      accountNumber={s.accountNumber}
      accountHolderName={s.accountHolderName}
      transactions={transactions.map((t) => ({
        id: t.id,
        type: t.type as string,
        status: t.status as string,
        amount: Number(t.amount),
        description: t.description,
        availableAt: t.availableAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      }))}
      withdrawals={withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status as string,
        bankName: w.bankName,
        accountNumber: w.accountNumber,
        createdAt: w.createdAt.toISOString(),
        completedAt: w.completedAt?.toISOString() ?? null,
      }))}
    />
  );
}
