import DashboardPage from "./dashboard-page";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function Home() {
  return (
    <DashboardShell>
      <DashboardPage />
    </DashboardShell>
  );
}
