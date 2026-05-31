import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import AddProductClient from "./AddProductClient";

export const metadata = {
  title: "Post a New Product | Vendo Supplier Dashboard",
  description: "List your quality products on Vendo.",
};

export default async function AddProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { supplier: true },
  });
  if (!dbUser?.supplier) redirect("/supplier/onboard");

  const s = dbUser.supplier;

  return (
    <AddProductClient
      supplierPickup={{
        address:  s.pickupAddress ?? s.address ?? "",
        city:     s.pickupCity   ?? s.state   ?? "",
        state:    s.pickupState  ?? s.state   ?? "",
        postCode: s.pickupPostCode ?? "",
        phone:    s.pickupPhone  ?? s.phone   ?? "",
      }}
    />
  );
}
