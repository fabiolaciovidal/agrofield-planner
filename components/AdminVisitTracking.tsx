import React, { useEffect, useMemo, useState } from 'react';
import { AppUser, Campaign, Client, Visit } from '../types';
import * as api from '../services/api';
import { getVisitDurationMinutes, isRescheduledVisit, summarizeVisits } from '../utils/visitTracking';
import { exportToCSV } from '../utils/export';

interface AdminVisitTrackingProps {
  visits: Visit[];
  clients: Client[];
  campaigns: Campaign[];
  selectedCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
  onSelectVisit: (visit: Visit) => void;
}

type StatusFilter = 'All' | Visit['status'] | 'Rescheduled';

const statusLabels: Record<Visit['status'], string> = {
  Planned: 'Planificada',
  InProgress: 'En curso',
  Completed: 'Completada',
  Cancelled: 'Cancelada',
};

const statusStyles: Record<Visit['status'], string> = {
  Planned: 'bg-blue-50 text-blue-700',
  InProgress: 'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
  Cancelled: 'bg-red-50 text-red-700',
};

const UNASSIGNED_SELLER = '__unassigned__';

const formatDate = (date: string) => {
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T12:00:00`));
};

const AdminVisitTracking: React.FC<AdminVisitTrackingProps> = ({
  visits,
  clients,
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onSelectVisit,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [sellerFilter, setSellerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getAppUsers().then(setUsers).catch((error) => {
      console.warn('No se pudieron cargar los nombres de vendedores.', error);
    });
  }, []);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );

  const sellerNameByCode = useMemo(() => {
    const names = new Map<string, string>();
    users.forEach((user) => {
      if (user.sellerCode) names.set(user.sellerCode, user.name);
      if (user.id) names.set(user.id, user.name);
    });
    return names;
  }, [users]);

  const sellerCodes = useMemo(() => {
    const codes = new Set<string>();
    users.filter((user) => user.role === 'Vendedor').forEach((user) => codes.add(user.sellerCode));
    visits.forEach((visit) => {
      if (visit.vendedorId) codes.add(visit.vendedorId);
    });
    if (visits.some((visit) => !visit.vendedorId)) codes.add(UNASSIGNED_SELLER);
    return [...codes].filter(Boolean).sort((a, b) =>
      (sellerNameByCode.get(a) || a).localeCompare(sellerNameByCode.get(b) || b)
    );
  }, [users, visits, sellerNameByCode]);

  const filteredVisits = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return visits
      .filter((visit) => sellerFilter === 'All'
        || (sellerFilter === UNASSIGNED_SELLER ? !visit.vendedorId : visit.vendedorId === sellerFilter))
      .filter((visit) => {
        if (statusFilter === 'All') return true;
        if (statusFilter === 'Rescheduled') return isRescheduledVisit(visit);
        return visit.status === statusFilter;
      })
      .filter((visit) => !dateFrom || visit.date >= dateFrom)
      .filter((visit) => !dateTo || visit.date <= dateTo)
      .filter((visit) => {
        if (!query) return true;
        const client = clientById.get(visit.clientId);
        const sellerName = visit.vendedorId ? sellerNameByCode.get(visit.vendedorId) : '';
        return [client?.name, client?.farmName, client?.erpCode, visit.vendedorId, sellerName, visit.notes, visit.commitments]
          .some((value) => value?.toLocaleLowerCase('es').includes(query));
      })
      .sort((a, b) => `${b.date} ${b.timeSlot}`.localeCompare(`${a.date} ${a.timeSlot}`));
  }, [visits, sellerFilter, statusFilter, dateFrom, dateTo, search, clientById, sellerNameByCode]);

  const summary = useMemo(() => summarizeVisits(filteredVisits), [filteredVisits]);

  const sellerSummaries = useMemo(() => sellerCodes.map((code) => {
    const sellerVisits = filteredVisits.filter((visit) =>
      code === UNASSIGNED_SELLER ? !visit.vendedorId : visit.vendedorId === code
    );
    return { code, ...summarizeVisits(sellerVisits) };
  }).filter((seller) => seller.total > 0).sort((a, b) => b.completed - a.completed), [sellerCodes, filteredVisits]);

  const clearFilters = () => {
    setSellerFilter('All');
    setStatusFilter('All');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const getSellerName = (code: string) =>
    code === UNASSIGNED_SELLER ? 'Sin vendedor asignado' : (sellerNameByCode.get(code) || code);

  const exportFilteredVisits = () => {
    const headers = [
      'fecha', 'horario', 'estado', 'reprogramada', 'cliente', 'finca', 'codigoERP',
      'vendedor', 'codigoVendedor', 'checkIn', 'checkOut', 'duracionMinutos',
      'resultado', 'compromisos', 'hectareas', 'cultivos'
    ];
    const rows = filteredVisits.map((visit) => {
      const client = clientById.get(visit.clientId);
      return {
        fecha: visit.date,
        horario: visit.timeSlot,
        estado: statusLabels[visit.status],
        reprogramada: isRescheduledVisit(visit) ? 'Sí' : 'No',
        cliente: client?.name || '',
        finca: client?.farmName || '',
        codigoERP: client?.erpCode || '',
        vendedor: visit.vendedorId ? (sellerNameByCode.get(visit.vendedorId) || visit.vendedorId) : 'Sin asignar',
        codigoVendedor: visit.vendedorId || '',
        checkIn: visit.checkIn ? new Date(visit.checkIn.time).toISOString() : '',
        checkOut: visit.checkOut ? new Date(visit.checkOut.time).toISOString() : '',
        duracionMinutos: getVisitDurationMinutes(visit) ?? '',
        resultado: visit.notes,
        compromisos: visit.commitments,
        hectareas: visit.productiveSurvey?.totalHectares ?? '',
        cultivos: visit.productiveSurvey?.crops.map((crop) => crop.cropType).join(', ') || '',
      };
    });
    exportToCSV(`seguimiento_visitas_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const currentCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Seguimiento de visitas</h2>
          <p className="text-sm text-gray-500">Ejecución, resultados y cumplimiento del equipo comercial.</p>
        </div>
        <div className="w-full md:w-72">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Campaña</label>
          <select
            value={selectedCampaignId}
            onChange={(event) => onSelectCampaign(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-800"
          >
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Buscar</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente, finca, vendedor o resultado"
              className="min-h-12 w-full rounded-xl border-gray-300 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Vendedor</label>
            <select value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} className="min-h-12 w-full rounded-xl border-gray-300 text-base">
              <option value="All">Todos</option>
              {sellerCodes.map((code) => <option key={code} value={code}>{getSellerName(code)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Estado</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="min-h-12 w-full rounded-xl border-gray-300 text-base">
              <option value="All">Todos</option>
              <option value="Planned">Planificadas</option>
              <option value="InProgress">En curso</option>
              <option value="Completed">Completadas</option>
              <option value="Cancelled">Canceladas</option>
              <option value="Rescheduled">Reprogramadas</option>
            </select>
          </div>
          <button type="button" onClick={clearFilters} className="min-h-12 self-end rounded-xl bg-gray-100 px-4 font-bold text-gray-700 hover:bg-gray-200">
            Limpiar filtros
          </button>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Desde</label>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="min-h-12 w-full rounded-xl border-gray-300 text-base" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Hasta</label>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="min-h-12 w-full rounded-xl border-gray-300 text-base" />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">{currentCampaign?.name || 'Campaña actual'} · {filteredVisits.length} visitas coinciden con los filtros</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Visitas', value: summary.total, detail: 'en el periodo', color: 'text-blue-700' },
          { label: 'Completadas', value: summary.completed, detail: `${summary.completionRate}% de cumplimiento`, color: 'text-green-700' },
          { label: 'Pendientes', value: summary.planned + summary.inProgress, detail: `${summary.inProgress} en curso`, color: 'text-amber-700' },
          { label: 'Reprogramadas', value: summary.rescheduled, detail: `${summary.cancelled} canceladas en total`, color: 'text-purple-700' },
          { label: 'Clientes visitados', value: summary.uniqueClientsVisited, detail: 'clientes únicos', color: 'text-cyan-700' },
          { label: 'Con resultado', value: summary.withResult, detail: 'nota, compromiso o encuesta', color: 'text-emerald-700' },
          { label: 'Duración promedio', value: summary.averageDurationMinutes === null ? '—' : `${summary.averageDurationMinutes} min`, detail: 'con check-in y check-out', color: 'text-indigo-700' },
          { label: 'Check-in', value: filteredVisits.filter((visit) => visit.checkIn).length, detail: 'ubicaciones registradas', color: 'text-rose-700' },
        ].map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className={`text-xs font-black uppercase tracking-wide ${metric.color}`}>{metric.label}</p>
            <p className="mt-2 break-words text-2xl font-black text-gray-900">{metric.value}</p>
            <p className="mt-1 text-xs text-gray-400">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">Cumplimiento por vendedor</h3>
          <p className="text-sm text-gray-500">Comparación según los filtros seleccionados.</p>
        </div>
        {sellerSummaries.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No hay visitas para comparar.</p>
        ) : (
          <div className="space-y-4">
            {sellerSummaries.map((seller) => (
              <div key={seller.code} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900">{getSellerName(seller.code)}</p>
                    <p className="text-xs text-gray-500">{seller.code} · {seller.completed} de {seller.total} completadas</p>
                  </div>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-black text-green-700">{seller.completionRate}%</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${seller.completionRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-gray-500">{seller.planned} pendientes · {seller.cancelled} canceladas · {seller.rescheduled} reprogramadas · {seller.withResult} con resultado</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Detalle de visitas</h3>
            <p className="text-sm text-gray-500">Abre una visita para revisar el registro completo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{filteredVisits.length} registros</span>
            <button type="button" onClick={exportFilteredVisits} className="min-h-11 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700">
              Descargar CSV
            </button>
          </div>
        </div>
        {filteredVisits.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No se encontraron visitas con estos filtros.</p>
        ) : (
          <div className="space-y-3">
            {filteredVisits.map((visit) => {
              const client = clientById.get(visit.clientId);
              const duration = getVisitDurationMinutes(visit);
              const hasResult = Boolean(visit.notes.trim() || visit.commitments.trim() || visit.productiveSurvey);
              return (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => onSelectVisit(visit)}
                  className="min-h-12 w-full rounded-xl border border-gray-100 p-4 text-left transition-colors hover:border-green-200 hover:bg-green-50/50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-900">{client?.farmName || client?.name || `Cliente ${visit.clientId}`}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusStyles[visit.status]}`}>{statusLabels[visit.status]}</span>
                        {isRescheduledVisit(visit) && <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase text-purple-700">Reprogramada</span>}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{formatDate(visit.date)} · {visit.timeSlot}</p>
                      <p className="mt-1 text-xs text-gray-500">{visit.vendedorId ? (sellerNameByCode.get(visit.vendedorId) || visit.vendedorId) : 'Sin vendedor asignado'}</p>
                      {hasResult && <p className="mt-2 line-clamp-2 text-sm text-gray-700">{visit.commitments || visit.notes || 'Información productiva registrada'}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
                      <span className={`rounded-lg px-2 py-1 ${visit.checkIn ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{visit.checkIn ? 'Check-in ✓' : 'Sin check-in'}</span>
                      {duration !== null && <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">{duration} min</span>}
                      <span className="rounded-lg bg-gray-900 px-2 py-1 text-white">Ver detalle</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminVisitTracking;
