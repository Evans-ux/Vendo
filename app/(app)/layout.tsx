import ConditionalNav from "@/components/ConditionalNav";

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
