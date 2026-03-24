import { useEffect, useState } from 'react';
import { AppSidebar } from '../components/common/AppSidebar';
import { DashboardDetailDrawer } from '../components/dashboard/DashboardDetailDrawer';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardInsights } from '../components/dashboard/DashboardInsights';
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics';
import { DashboardTable } from '../components/dashboard/DashboardTable';
import { eventDetails, tableRows } from '../components/dashboard/dashboardData';

export default function Dashboard() {
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
      <AppSidebar activeItem="dashboard" ariaLabel="Dashboard Navigation" />

      <main className="relative ml-64 flex flex-1 flex-col overflow-hidden">
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

      <button
        type="button"
        className="fixed bottom-8 right-8 z-30 flex items-center gap-3 rounded-full bg-slate-900 px-6 py-4 text-white shadow-xl transition-all hover:scale-105 active:scale-95"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          add
        </span>
        <span className="text-sm font-bold">New Analysis Task</span>
      </button>

      <DashboardDetailDrawer detail={selectedDetail} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </div>
  );
}
