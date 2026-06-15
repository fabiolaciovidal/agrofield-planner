import React, { useState, useCallback, useEffect } from 'react';
import { View, Visit, User, Client, Campaign, SalesPlan, ClientPriority, LeadStatus } from './types';
import * as api from './services/api';
import * as sync from './services/sync';
import Dashboard from './components/Dashboard';
import BottomNav from './components/BottomNav';
import Planner from './components/Planner';
import VisitDetail from './components/VisitDetail';
import ClientList from './components/ClientList';
import ClientDetail from './components/ClientDetail';
import Login from './components/Login';
import Spinner from './components/Spinner';
import AdminImport from './components/AdminImport';
import AdminCommercial from './components/AdminCommercial';
import AdminUsers from './components/AdminUsers';
import AdminHome from './components/AdminHome';

const SESSION_USER_KEY = 'agrofield_session_user';
const SESSION_CAMPAIGN_KEY = 'agrofield_selected_campaign';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const OnlineStatusIcon: React.FC<{ isOnline: boolean; pendingActions: number }> = ({ isOnline, pendingActions }) => {
    const title = isOnline 
        ? (pendingActions > 0 ? `En línea - Sincronizando ${pendingActions} acciones` : 'En línea')
        : `Sin conexión - ${pendingActions} acciones pendientes`;

    return (
        <div className="flex items-center space-x-2" title={title}>
            {pendingActions > 0 && (
                <span className="flex items-center space-x-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold animate-pulse">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    <span>{pendingActions}</span>
                </span>
            )}
            {isOnline ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
            )}
        </div>
    );
};


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allSalesPlans, setAllSalesPlans] = useState<SalesPlan[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [salesPlan, setSalesPlan] = useState<{ target: number, current: number } | undefined>(undefined);
  const [authError, setAuthError] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [clientLeadStatusFilter, setClientLeadStatusFilter] = useState<LeadStatus | null>(null);
  const [clientPriorityFilter, setClientPriorityFilter] = useState<ClientPriority | null>(null);
  const dataScopeUserId = user?.role === 'Gerente' || user?.role === 'Admin'
    ? undefined
    : (user?.sellerCode || user?.id);
  const isAdminUser = user?.role === 'Gerente' || user?.role === 'Admin';

  useEffect(() => {
    const savedUser = localStorage.getItem(SESSION_USER_KEY);
    const savedCampaignId = localStorage.getItem(SESSION_CAMPAIGN_KEY);

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User);
        setIsAuthenticated(true);
        if (savedCampaignId) setSelectedCampaignId(savedCampaignId);
      } catch {
        localStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem(SESSION_CAMPAIGN_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    sync.getQueueCount().then(setPendingActionsCount);
    
    const interval = setInterval(() => {
        sync.getQueueCount().then(setPendingActionsCount);
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        const [fetchedVisits, fetchedClients, fetchedPlans, fetchedAllPlans] = await Promise.all([
          api.getVisits(isOnline, dataScopeUserId, selectedCampaignId),
          api.getClients(isOnline, dataScopeUserId),
          dataScopeUserId && selectedCampaignId ? api.getSalesPlans(isOnline, dataScopeUserId, selectedCampaignId) : Promise.resolve([]),
          user?.role === 'Gerente' || user?.role === 'Admin'
            ? api.getSalesPlans(isOnline, undefined, selectedCampaignId)
            : Promise.resolve([])
        ]);
        setVisits(fetchedVisits);
        setClients(fetchedClients);
        setAllSalesPlans(fetchedAllPlans);
        
        if (fetchedPlans && fetchedPlans.length > 0) {
            setSalesPlan({ target: fetchedPlans[0].targetValue, current: fetchedPlans[0].currentProgress });
        } else {
            setSalesPlan(undefined);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }, [isOnline, dataScopeUserId, selectedCampaignId, user?.role]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  useEffect(() => {
    if (!isAuthenticated) return;

    api.getCampaigns(isOnline).then((fetchedCampaigns) => {
      setCampaigns(fetchedCampaigns);

      const savedCampaignId = localStorage.getItem(SESSION_CAMPAIGN_KEY);
      const savedCampaign = savedCampaignId
        ? fetchedCampaigns.find((campaign) => campaign.id === savedCampaignId)
        : undefined;
      const activeCampaign = savedCampaign || fetchedCampaigns.find(c => c.active) || fetchedCampaigns[0];

      if (activeCampaign) {
        setSelectedCampaignId(activeCampaign.id);
        localStorage.setItem(SESSION_CAMPAIGN_KEY, activeCampaign.id);
      }
    }).catch((error) => {
      console.error("Failed to fetch campaigns:", error);
    });
  }, [isAuthenticated, isOnline]);
  
  useEffect(() => {
      if(isOnline){
          sync.processSyncQueue().then(() => fetchData());
      }
  }, [isOnline, fetchData]);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const loggedInUser = await api.login(username, password);
      setUser(loggedInUser);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(loggedInUser));
      
      const fetchedCampaigns = await api.getCampaigns(isOnline);
      setCampaigns(fetchedCampaigns);
      
      const activeCampaign = fetchedCampaigns.find(c => c.active) || fetchedCampaigns[0];
      if (activeCampaign) {
        setSelectedCampaignId(activeCampaign.id);
        localStorage.setItem(SESSION_CAMPAIGN_KEY, activeCampaign.id);
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
      localStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem(SESSION_CAMPAIGN_KEY);
      setUser(null);
      setIsAuthenticated(false);
      setVisits([]);
      setClients([]);
  }

  const handleInstallApp = async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
          setInstallPrompt(null);
      }
  };

  const navigateToFilteredClients = (filter: { leadStatus?: LeadStatus; priority?: ClientPriority }) => {
      setClientLeadStatusFilter(filter.leadStatus || null);
      setClientPriorityFilter(filter.priority || null);
      setCurrentView(View.CLIENTS);
  };

  const clearClientFilters = () => {
      setClientLeadStatusFilter(null);
      setClientPriorityFilter(null);
  };

  const navigateToVisit = useCallback((visit: Visit) => {
    setSelectedVisit(visit);
    setCurrentView(View.VISIT_DETAIL);
  }, []);

  const navigateToClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setCurrentView(View.CLIENT_DETAIL);
  }, []);
  
  const handleUpdateVisit = (updatedVisit: Visit) => {
    setVisits(prev => prev.map(v => v.id === updatedVisit.id ? updatedVisit : v));
    setSelectedVisit(updatedVisit);
  };

  const handleUpdateClient = (updatedClient: Client) => {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
  };

  const handleDeleteClient = (clientId: number) => {
      setClients(prev => prev.filter(c => c.id !== clientId));
      setVisits(prev => prev.filter(v => v.clientId !== clientId));
      setSelectedClient(null);
  }
  
  const handleCreateVisit = (newVisit: Visit) => {
      setVisits(prev => [...prev, newVisit]);
  };
  
  const handleCreateClient = (newClient: Client) => {
      setClients(prev => [...prev, newClient]);
  };

  const renderView = () => {
    if (isLoading && !clients.length) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
      
    switch (currentView) {
      case View.DASHBOARD:
        return (
            <Dashboard 
                visits={visits} 
                clients={clients} 
                onSelectVisit={navigateToVisit} 
                onNavigateToImport={() => setCurrentView(View.ADMIN_IMPORT)}
                onFilterClients={navigateToFilteredClients}
                salesPlan={salesPlan}
                isAdmin={isAdminUser}
            />
        );
      case View.ADMIN_HOME:
        return <AdminHome setView={setCurrentView} />;
      case View.PLANNER:
        return <Planner visits={visits} clients={clients} onSelectVisit={navigateToVisit} onCreateVisit={handleCreateVisit} isOnline={isOnline}/>;
      case View.ADMIN_COMMERCIAL:
        return (
          <AdminCommercial
            campaigns={campaigns}
            clients={clients}
            salesPlans={allSalesPlans}
            selectedCampaignId={selectedCampaignId}
            onSelectCampaign={setSelectedCampaignId}
          />
        );
      case View.ADMIN_USERS:
        return <AdminUsers />;
      case View.CLIENTS:
        return (
          <ClientList
            clients={clients}
            onCreateClient={handleCreateClient}
            isOnline={isOnline}
            onSelectClient={navigateToClient}
            initialLeadStatusFilter={clientLeadStatusFilter}
            initialPriorityFilter={clientPriorityFilter}
            onClearInitialFilters={clearClientFilters}
          />
        );
      case View.CLIENT_DETAIL:
          return selectedClient ? (
              <ClientDetail 
                client={selectedClient} 
                onBack={() => setCurrentView(View.CLIENTS)} 
                isOnline={isOnline} 
                onUpdateClient={handleUpdateClient} 
                onDeleteClient={handleDeleteClient}
              />
          ) : (
            <ClientList
              clients={clients}
              onCreateClient={handleCreateClient}
              isOnline={isOnline}
              onSelectClient={navigateToClient}
              initialLeadStatusFilter={clientLeadStatusFilter}
              initialPriorityFilter={clientPriorityFilter}
              onClearInitialFilters={clearClientFilters}
            />
          );
      case View.VISIT_DETAIL:
        return selectedVisit ? (
            <VisitDetail 
                visit={selectedVisit} 
                onBack={() => setCurrentView(View.DASHBOARD)} 
                onUpdateVisit={handleUpdateVisit}
                isOnline={isOnline}
            />
        ) : (
            <Dashboard 
                visits={visits} 
                clients={clients} 
                onSelectVisit={navigateToVisit} 
                onNavigateToImport={() => setCurrentView(View.ADMIN_IMPORT)}
                onFilterClients={navigateToFilteredClients}
                salesPlan={salesPlan}
                isAdmin={isAdminUser}
            />
        );
      case View.ADMIN_IMPORT:
          return <AdminImport onBack={() => setCurrentView(View.DASHBOARD)} isOnline={isOnline} />;
      default:
        return (
            <Dashboard 
                visits={visits} 
                clients={clients} 
                onSelectVisit={navigateToVisit} 
                onNavigateToImport={() => setCurrentView(View.ADMIN_IMPORT)}
                onFilterClients={navigateToFilteredClients}
                salesPlan={salesPlan}
                isAdmin={isAdminUser}
            />
        );
    }
  };
  
  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} error={authError} />
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 font-sans text-gray-800 flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-10 border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-green-700 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>AgroField CRM</span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">Bienvenido, {user?.name}</p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
                <select 
                    value={selectedCampaignId}
                    onChange={(e) => {
                        setSelectedCampaignId(e.target.value);
                        localStorage.setItem(SESSION_CAMPAIGN_KEY, e.target.value);
                    }}
                    className="text-[10px] bg-green-50 text-green-700 font-bold border-none rounded-md py-1 focus:ring-0 cursor-pointer uppercase"
                >
                    {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <OnlineStatusIcon isOnline={isOnline} pendingActions={pendingActionsCount}/>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button onClick={handleLogout} className="text-xs bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">
                SALIR
            </button>
            {installPrompt && (
              <button onClick={handleInstallApp} className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors">
                  INSTALAR
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow pb-24">
        <div className="max-w-4xl mx-auto p-4 animate-fadeIn">
          {renderView()}
        </div>
      </main>

      <BottomNav
        currentView={currentView}
        setView={setCurrentView}
        isCommercialAdmin={isAdminUser}
      />
    </div>
  );
};

export default App;
