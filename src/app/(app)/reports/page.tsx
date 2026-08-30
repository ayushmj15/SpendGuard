import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getReportDefaultsAction } from "@/actions/query";
import { ReportsClient } from "@/components/reports/reports-client";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const defaults = await getReportDefaultsAction();

  return <ReportsClient defaults={defaults} />;
}
