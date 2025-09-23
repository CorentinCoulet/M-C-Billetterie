import DashboardHome from '@/components/dashboard/DashboardHome';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  );
}
