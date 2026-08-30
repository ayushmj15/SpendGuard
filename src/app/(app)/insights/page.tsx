import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInsights } from "@/services/insights";
import { InsightsClient } from "@/components/insights/insights-client";

export const metadata: Metadata = {
  title: "Insights",
};

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const insights = await getInsights(session.user.id);

  return <InsightsClient insights={insights} />;
}
