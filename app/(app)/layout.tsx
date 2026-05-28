import ConditionalNav from "@/components/ConditionalNav";


export const metadata = {
  title: {
    default: "AI Powered Ecommerce Platform",
    template: "%s | Vendo"
  },
  description: "Smart ecommerce powered by Vee AI and automation for reaching customers on Telegram and WhatsApp. For suppliers, it's a hassle-free way to sell online with AI handling customer interactions and orders.",
};
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ConditionalNav />
      {children}
    </>
  );
}
