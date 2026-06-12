import React from 'react';
import { Campaign, Client, SalesPlan } from '../types';

interface AdminCommercialProps {
  campaigns: Campaign[];
  clients: Client[];
  salesPlans: SalesPlan[];
  selectedCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
}

const currency = (value: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(value);

const AdminCommercial: React.FC<AdminCommercialProps> = ({
  campaigns,
  clients,
  salesPlans,
  selectedCampaignId,
  onSelectCampaign,
}) => {
  const filteredPlans = selectedCampaignId
    ? salesPlans.filter((plan) => plan.campaignId === selectedCampaignId)
    : salesPlans;

  const sellerSummaries = filteredPlans
    .map((plan) => {
      const portfolio = clients.filter((client) => client.vendedorId === plan.vendedorId);
      const activeClients = portfolio.filter((client) => client.leadStatus === 'Active').length;
      const prospects = portfolio.filter((client) => client.leadStatus === 'Prospect').length;
      const progressPct = plan.targetValue > 0 ? Math.round((plan.currentProgress / plan.targetValue) * 100) : 0;

      return {
        code: plan.vendedorId,
        portfolioCount: portfolio.length,
        activeClients,
        prospects,
        targetValue: plan.targetValue,
        currentProgress: plan.currentProgress,
        progressPct,
      };
    })
    .sort((a, b) => b.currentProgress - a.currentProgress);

  const totalTarget = filteredPlans.reduce((sum, plan) => sum + Number(plan.targetValue || 0), 0);
  const totalProgress = filteredPlans.reduce((sum, plan) => sum + Number(plan.currentProgress || 0), 0);
  const totalClients = sellerSummaries.reduce((sum, seller) => sum + seller.portfolioCount, 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.active).length;
  const currentCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Comercial</h2>
          <p className="text-gray-500">Visibilidad de campañas, cartera asignada y cumplimiento por vendedor.</p>
        </div>
        <div className="w-full md:w-72">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Campaña Analizada</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => onSelectCampaign(e.target.value)}
            className="w-full rounded-xl border border-green-100 bg-white px-4 py-3 text-sm font-semibold text-green-700 shadow-sm focus:border-green-400 focus:outline-none"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-green-600">Campañas Activas</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{activeCampaigns}</p>
          <p className="mt-1 text-xs text-gray-400">{currentCampaign ? currentCampaign.name : 'Sin campaña seleccionada'}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Presupuesto</p>
          <p className="mt-3 text-2xl font-black text-gray-900">{currency(totalTarget)}</p>
          <p className="mt-1 text-xs text-gray-400">objetivo consolidado</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Avance Real</p>
          <p className="mt-3 text-2xl font-black text-gray-900">{currency(totalProgress)}</p>
          <p className="mt-1 text-xs text-gray-400">
            {totalTarget > 0 ? `${Math.round((totalProgress / totalTarget) * 100)}% del objetivo` : 'Sin objetivo cargado'}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Clientes Asignados</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{totalClients}</p>
          <p className="mt-1 text-xs text-gray-400">cartera visible en la campaña</p>
        </div>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Presupuesto por Vendedor</h3>
            <p className="text-sm text-gray-500">Resumen comercial consolidado por código de vendedor.</p>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
            {sellerSummaries.length} vendedores
          </span>
        </div>

        {sellerSummaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-400">
            No hay planes comerciales cargados para la campaña seleccionada.
          </div>
        ) : (
          <div className="space-y-4">
            {sellerSummaries.map((seller) => (
              <div key={`${seller.code}-${selectedCampaignId}`} className="rounded-2xl border border-gray-100 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Vendedor</p>
                    <h4 className="text-xl font-bold text-gray-900">{seller.code}</h4>
                    <p className="text-sm text-gray-500">
                      {seller.portfolioCount} clientes en cartera, {seller.activeClients} activos, {seller.prospects} prospectos
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm font-semibold text-gray-500">Avance</p>
                    <p className="text-lg font-black text-gray-900">{currency(seller.currentProgress)}</p>
                    <p className="text-xs text-gray-400">de {currency(seller.targetValue)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                    <span>Cumplimiento</span>
                    <span>{seller.progressPct}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
                      style={{ width: `${Math.min(seller.progressPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Campañas Cargadas</h3>
          <div className="mt-4 space-y-3">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => onSelectCampaign(campaign.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                  campaign.id === selectedCampaignId
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-100 bg-white hover:border-green-200 hover:bg-green-50/50'
                }`}
              >
                <div>
                  <p className="font-bold text-gray-900">{campaign.name}</p>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {campaign.season} {campaign.year}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                  campaign.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {campaign.active ? 'Activa' : 'Inactiva'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Cobertura Comercial</h3>
          <div className="mt-4 space-y-4">
            {sellerSummaries.slice(0, 5).map((seller) => (
              <div key={`coverage-${seller.code}`} className="rounded-2xl bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800">{seller.code}</p>
                  <p className="text-sm font-semibold text-gray-500">{seller.portfolioCount} clientes</p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Prospectos: {seller.prospects} | Activos: {seller.activeClients}
                </p>
              </div>
            ))}
            {sellerSummaries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
                Sin datos comerciales para mostrar cobertura.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminCommercial;
