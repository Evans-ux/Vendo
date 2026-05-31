import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
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

  return (
    <SettingsClient
      supplierId={s.id}
      businessName={s.businessName}
      phone={s.phone}
      state={s.state}
      bio={s.bio}
      bankName={s.bankName}
      bankCode={s.bankCode}
      accountNumber={s.accountNumber}
      accountHolderName={s.accountHolderName}
      hasPin={!!s.withdrawalPin}
      pickupAddress={s.pickupAddress}
      pickupCity={s.pickupCity}
      pickupState={s.pickupState}
      pickupPostCode={s.pickupPostCode}
      pickupPhone={s.pickupPhone}
    />
  );
}
