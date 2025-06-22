import { Sidebar } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Sidebar>
      {children}
    </Sidebar>
  );
}