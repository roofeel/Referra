import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppSidebar } from '../components/common/AppSidebar';
import { DashboardDetailDrawer } from '../components/dashboard/DashboardDetailDrawer';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardInsights } from '../components/dashboard/DashboardInsights';
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics';
import { DashboardTable } from '../components/dashboard/DashboardTable';
import { eventDetails, tableRows } from '../components/dashboard/dashboardData';

export default function ReportsDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const [selectedRow, setSelectedRow] = useState(tableRows[0]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const selectedDetail = eventDetails[selectedRow.eventId];

  useEffect(() => {
    if (!isDetailOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDetailOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f4f6] text-slate-900 antialiased">
      <AppSidebar activeItem="reports" ariaLabel="Reports Detail Navigation" />

      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Report Detail</p>
            <h1 className="text-lg font-bold text-slate-900">{reportId ? `Task #${reportId}` : 'Task Detail'}</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:hidden">
          <DashboardFilters />
          <DashboardMetrics />
          <DashboardInsights />
          <DashboardTable
            selectedRow={selectedRow}
            onSelectRow={(row) => {
              setSelectedRow(row);
              setIsDetailOpen(true);
            }}
          />
        </div>
      </main>

      <DashboardDetailDrawer detail={selectedDetail} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </div>
  );
}
