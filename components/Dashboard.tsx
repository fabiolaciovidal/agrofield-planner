import React from 'react';
import { Visit, Client, ClientPriority, LeadStatus } from '../types';
import { VisitCard } from './VisitCard';
import * as api from '../services/api';

interface DashboardProps {
  visits: Visit[];
  clients: Client[];
  onSelectVisit: (visit: Visit) => void;
  onNavigateToImport: () => void;
  onFilterClients: (filter: { leadStatus?: LeadStatus; priority?: ClientPriority }) => void;
  salesPlan?: { target: number, current: number };
  isAdmin?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ visits, clients, onSelectVisit, onNavigateToImport, onFilterClients, salesPlan, isAdmin = false }) => {
  const today = new Date().toISOString().split('T')[0];
  const todaysVisits = visits.filter(v => v.date === today);

  const completedToday = todaysVisits.filter(v => v.status === 'Completed').length;
  
  // Calculate CRM Stats
  const prospects = clients.filter(c => c.leadStatus === 'Prospect').length;
  const activeClients = clients.filter(c => c.leadStatus === 'Active').length;
  const highPriority = clients.filter(c => c.priority === 'High').length;
  const inactiveClients = clients.filter(c => c.leadStatus === 'Inactive').length;
  const lostClients = clients.filter(c => c.leadStatus === 'Lost').length;
  const mediumPriority = clients.filter(c => c.priority === 'Medium').length;
  const lowPriority = clients.filter(c => c.priority === 'Low').length;
  const priorityTotal = Math.max(clients.length, 1);

  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        // Obtenemos el userId desde algún lado, o lo omitimos si trae de todos por ahora
        await api.forceSyncAll();
        alert("Sincronización completada exitosamente.");
        // Opcional: Recargar la página para ver los clientes nuevos
        window.location.reload();
    } catch (e) {
        alert("Sincronización finalizada con errores (o estás offline).");
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Hoy</h2>
          <p className="text-gray-500">Tus visitas y pendientes del día.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing || !navigator.onLine}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-sm transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSyncing ? 'Actualizando...' : 'Actualizar datos'}</span>
        </button>
      </div>

      {/* Operative Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Visitas</span>
            <p className="text-3xl font-extrabold text-gray-800">{todaysVisits.length}</p>
            <span className="text-xs text-gray-400">programadas hoy</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Completadas</span>
            <p className="text-3xl font-extrabold text-gray-800">{completedToday}</p>
            <span className="text-xs text-gray-400">en el día</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Prospectos</span>
            <p className="text-3xl font-extrabold text-gray-800">{prospects}</p>
            <span className="text-xs text-gray-400">oportunidades</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Prioridad Alta</span>
            <p className="text-3xl font-extrabold text-gray-800">{highPriority}</p>
            <span className="text-xs text-gray-400">atención requerida</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Agenda Section */}
        <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Visitas de Hoy
            </h3>
            <div className="space-y-4">
            {todaysVisits.length > 0 ? (
                todaysVisits.map(visit => {
                const client = clients.find(c => c.id === visit.clientId);
                return client ? <VisitCard key={visit.id} visit={visit} client={client} onSelectVisit={onSelectVisit} /> : null;
                })
            ) : (
                <div className="bg-white p-8 rounded-xl border border-dashed border-gray-200 text-center text-gray-400">
                <p className="text-sm">No tienes visitas planificadas para hoy.</p>
                </div>
            )}
            </div>
        </section>

        {/* Sales Funnel Section */}
        <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                Cartera Comercial
            </h3>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="w-full max-w-[240px] space-y-1">
                    <button
                        onClick={() => onFilterClients({ leadStatus: 'Prospect' })}
                        className="relative block w-full text-center transition-transform active:scale-[0.98]"
                        title="Ver prospectos"
                    >
                        <div className="h-10 bg-blue-500 rounded-t-lg flex items-center justify-center text-white text-xs font-bold" style={{ width: '100%' }}>
                            Prospectos ({prospects})
                        </div>
                    </button>
                    <button
                        onClick={() => onFilterClients({ leadStatus: 'Active' })}
                        className="relative flex w-full justify-center transition-transform active:scale-[0.98]"
                        title="Ver clientes activos"
                    >
                        <div className="h-10 bg-green-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: '85%' }}>
                            Activos ({activeClients})
                        </div>
                    </button>
                    <button
                        onClick={() => onFilterClients({ leadStatus: 'Inactive' })}
                        className="relative flex w-full justify-center transition-transform active:scale-[0.98]"
                        title="Ver clientes inactivos"
                    >
                        <div className="h-10 bg-yellow-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: '70%' }}>
                            Inactivos ({inactiveClients})
                        </div>
                    </button>
                    <button
                        onClick={() => onFilterClients({ leadStatus: 'Lost' })}
                        className="relative flex w-full justify-center transition-transform active:scale-[0.98]"
                        title="Ver clientes perdidos"
                    >
                        <div className="h-10 bg-red-400 rounded-b-lg flex items-center justify-center text-white text-xs font-bold" style={{ width: '55%' }}>
                            Perdidos ({lostClients})
                        </div>
                    </button>
                </div>
                
                <div className="mt-6 w-full pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400 mb-3 uppercase font-bold text-center">Prioridad de Cartera</p>
                    <div className="flex h-4 rounded-full overflow-hidden">
                        <button
                            onClick={() => onFilterClients({ priority: 'High' })}
                            className="bg-red-500"
                            style={{ width: `${(highPriority / priorityTotal) * 100}%` }}
                            title="Ver prioridad alta"
                            aria-label="Ver clientes de prioridad alta"
                        />
                        <button
                            onClick={() => onFilterClients({ priority: 'Medium' })}
                            className="bg-yellow-400"
                            style={{ width: `${(mediumPriority / priorityTotal) * 100}%` }}
                            title="Ver prioridad media"
                            aria-label="Ver clientes de prioridad media"
                        />
                        <button
                            onClick={() => onFilterClients({ priority: 'Low' })}
                            className="bg-gray-200"
                            style={{ width: `${(lowPriority / priorityTotal) * 100}%` }}
                            title="Ver prioridad baja"
                            aria-label="Ver clientes de prioridad baja"
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase">
                        <button onClick={() => onFilterClients({ priority: 'High' })}>Alta</button>
                        <button onClick={() => onFilterClients({ priority: 'Medium' })}>Media</button>
                        <button onClick={() => onFilterClients({ priority: 'Low' })}>Baja</button>
                    </div>
                </div>
                <p className="mt-4 text-center text-[11px] font-medium text-gray-400">
                    Toca una etapa o prioridad para ver la cartera filtrada.
                </p>
            </div>
        </section>

        {/* Reporting Section */}
        {isAdmin && <section className="md:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Reportes Administrativos
            </h3>
            <div className="report-actions grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-6">
                <button 
                    onClick={() => api.exportVisitsReport()}
                    className="report-action-button min-w-0 rounded-xl border border-purple-100 bg-purple-50 px-3 py-3 font-bold text-purple-700 transition-colors hover:bg-purple-100 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                    <span className="text-center text-sm leading-tight">Exportar Visitas (Excel)</span>
                </button>
                <button 
                    onClick={() => api.exportInteractionsReport()}
                    className="report-action-button min-w-0 rounded-xl border border-orange-100 bg-orange-50 px-3 py-3 font-bold text-orange-700 transition-colors hover:bg-orange-100 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                    <span className="text-center text-sm leading-tight">Exportar Interacciones</span>
                </button>
                <button 
                    onClick={onNavigateToImport}
                    className="report-action-button min-w-0 rounded-xl border border-green-100 bg-green-50 px-3 py-3 font-bold text-green-700 transition-colors hover:bg-green-100 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-center text-sm leading-tight">Importar Datos (CSV)</span>
                </button>
            </div>
        </section>}

        {/* Budget Progress Section (New) */}
        {salesPlan && (
            <section className="md:col-span-2">
                <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Cumplimiento Plan de Ventas</h3>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">Camp. Actual</span>
                    </div>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-3xl font-black">${salesPlan.current.toLocaleString()}</p>
                            <p className="text-xs opacity-80 uppercase font-bold">Ventas Logradas</p>
                        </div>
                        <div className="text-right text-xs">
                            <p className="opacity-80">Objetivo: ${salesPlan.target.toLocaleString()}</p>
                            <p className="font-bold">{Math.round((salesPlan.current / salesPlan.target) * 100)}% Completado</p>
                        </div>
                    </div>
                    <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                        <div 
                            className="bg-white h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                            style={{ width: `${Math.min((salesPlan.current / salesPlan.target) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </section>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
