import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FeedbackList } from './components/FeedbackList';
import { TicketDetail } from './components/TicketDetail';
import './App.css';

export function App() {
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(k => k + 1);

  const handleDeleteLibrary = () => {
    setSelectedLibrary(null);
    setRefreshKey(k => k + 1);
  };

  const handleSelectLibrary = (library: string | null) => {
    setSelectedLibrary(library);
    setSelectedTicketId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <header className="flex items-baseline gap-3 px-6 py-4 bg-bg-secondary border-b border-border">
        <h1 className="text-2xl font-bold text-accent tracking-tight">Feedback</h1>
        <span className="text-sm text-text-secondary font-medium">Manager</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedLibrary={selectedLibrary}
          onSelectLibrary={handleSelectLibrary}
          refreshKey={refreshKey}
        />
        {selectedTicketId !== null ? (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={() => setSelectedTicketId(null)}
            onRefresh={handleRefresh}
          />
        ) : (
          <FeedbackList
            library={selectedLibrary}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            onDeleteLibrary={handleDeleteLibrary}
            onSelectTicket={setSelectedTicketId}
          />
        )}
      </div>
    </div>
  );
}
