import DashboardPage from "../dashboard-page";
import { DashboardShell } from "@/components/mission-control/dashboard/DashboardShell";

export default function OverviewPage() {
  return (
    <DashboardShell>
      <DashboardPage />
    </DashboardShell>
  );
}