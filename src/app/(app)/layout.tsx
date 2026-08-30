import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { Toaster } from "sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-full">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
      <AddExpenseDialog />
      <Toaster richColors position="top-center" />
    </div>
  );
}
