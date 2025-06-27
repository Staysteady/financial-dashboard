import { Sidebar } from '@/components/ui/sidebar';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Sidebar>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </Sidebar>
  );
}