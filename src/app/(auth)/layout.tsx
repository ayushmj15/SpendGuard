import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="mb-8">
          <Logo className="scale-125" />
        </div>
        {children}
      </div>
    </div>
  );
}
