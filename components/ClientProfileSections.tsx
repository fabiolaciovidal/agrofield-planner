import React, { useEffect, useState } from 'react';
import { AgriculturalProfile, Client, CropProductionRecord } from '../types';
import * as api from '../services/api';
import {
  createCropProductionRecord,
  cropNamesFromProfile,
  getAgriculturalProfile,
  validateAgriculturalProfile,
} from '../utils/clientAgriculture';

interface ClientProfileSectionsProps {
  client: Client;
  isOnline: boolean;
  onUpdateClient: (client: Client) => void;
}

const inputClass = 'mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-green-500 focus:ring-green-500';

const toOptionalNumber = (value: string): number | undefined => value === '' ? undefined : Number(value);

const ClientProfileSections: React.FC<ClientProfileSectionsProps> = ({ client, isOnline, onUpdateClient }) => {
  const [editingBasic, setEditingBasic] = useState(false);
  const [showAgriculture, setShowAgriculture] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [basic, setBasic] = useState({
    name: client.name,
    farmName: client.farmName,
    contactPerson: client.contactPerson,
    phone: client.phone,
    address: client.address,
  });
  const [profile, setProfile] = useState<AgriculturalProfile>(() => getAgriculturalProfile(client.agriculturalProfile, client.crops));

  useEffect(() => {
    setBasic({
      name: client.name,
      farmName: client.farmName,
      contactPerson: client.contactPerson,
      phone: client.phone,
      address: client.address,
    });
    setProfile(getAgriculturalProfile(client.agriculturalProfile, client.crops));
  }, [client]);

  const saveClient = async (updatedClient: Client, successMessage: string) => {
    setIsSaving(true);
    setMessage('');
    try {
      const result = await api.updateClient(updatedClient, isOnline);
      onUpdateClient(result);
      setMessage(isOnline ? successMessage : `${successMessage} Se sincronizará al recuperar conexión.`);
      return true;
    } catch (error) {
      console.error('No se pudo actualizar el cliente:', error);
      setMessage('No se pudieron guardar los cambios. Vuelve a intentarlo.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBasic = async () => {
    if (!basic.name.trim() || !basic.farmName.trim()) {
      setMessage('Nombre del cliente y nombre de la finca son obligatorios.');
      return;
    }
    const saved = await saveClient({
      ...client,
      name: basic.name.trim(),
      farmName: basic.farmName.trim(),
      contactPerson: basic.contactPerson.trim() || basic.name.trim(),
      phone: basic.phone.trim(),
      address: basic.address.trim() || 'Sin dirección registrada',
    }, 'Datos básicos actualizados.');
    if (saved) setEditingBasic(false);
  };

  const updateCrop = (id: string, changes: Partial<CropProductionRecord>) => {
    setProfile((current) => ({
      ...current,
      crops: current.crops.map((crop) => crop.id === id ? { ...crop, ...changes } : crop),
    }));
  };

  const handleSaveAgriculture = async () => {
    const errors = validateAgriculturalProfile(profile);
    if (errors.length > 0) {
      setMessage(errors.join(' '));
      return;
    }
    await saveClient({
      ...client,
      crops: cropNamesFromProfile(profile),
      agriculturalProfile: profile,
    }, 'Información productiva actualizada.');
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-800">Datos básicos del cliente</h3>
            <p className="text-xs text-gray-500">Información que el vendedor puede mantener actualizada.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditingBasic((value) => !value)}
            className="shrink-0 rounded-lg border border-green-200 px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-50"
          >
            {editingBasic ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {editingBasic ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-700">Nombre del cliente
              <input value={basic.name} onChange={(event) => setBasic({ ...basic, name: event.target.value })} className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Nombre de la finca
              <input value={basic.farmName} onChange={(event) => setBasic({ ...basic, farmName: event.target.value })} className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Persona de contacto
              <input value={basic.contactPerson} onChange={(event) => setBasic({ ...basic, contactPerson: event.target.value })} className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Teléfono
              <input type="tel" value={basic.phone} onChange={(event) => setBasic({ ...basic, phone: event.target.value })} className={inputClass} />
            </label>
            <label className="text-sm text-gray-700 sm:col-span-2">Dirección o referencia
              <input value={basic.address} onChange={(event) => setBasic({ ...basic, address: event.target.value })} className={inputClass} />
            </label>
            <div className="sm:col-span-2">
              <button type="button" onClick={handleSaveBasic} disabled={isSaving} className="w-full rounded-lg bg-green-600 px-4 py-2 font-bold text-white disabled:bg-gray-400 sm:w-auto">
                {isSaving ? 'Guardando...' : 'Guardar datos básicos'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <p><span className="block text-xs text-gray-400">Cliente</span>{client.name}</p>
            <p><span className="block text-xs text-gray-400">Finca</span>{client.farmName}</p>
            <p><span className="block text-xs text-gray-400">Contacto</span>{client.contactPerson || 'No registrado'}</p>
            <p><span className="block text-xs text-gray-400">Teléfono</span>{client.phone || 'No registrado'}</p>
            <p className="sm:col-span-2"><span className="block text-xs text-gray-400">Dirección o referencia</span>{client.address || 'No registrada'}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-green-100 bg-white shadow-sm">
        <button
          type="button"
          aria-expanded={showAgriculture}
          onClick={() => setShowAgriculture((value) => !value)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-6"
        >
          <div>
            <h3 className="font-bold text-gray-800">Información productiva</h3>
            <p className="text-xs text-gray-500">
              {profile.crops.length > 0 ? `${profile.crops.length} cultivo(s) registrado(s)` : 'Agrega superficie, cultivos y datos productivos.'}
            </p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
            {showAgriculture ? '−' : '+'}
          </span>
        </button>

        {showAgriculture && (
          <div className="border-t border-green-100 p-4 sm:p-6">
            <label className="block max-w-sm text-sm text-gray-700">Superficie total del cliente (ha)
              <input type="number" min="0" step="0.01" value={profile.totalHectares ?? ''} onChange={(event) => setProfile({ ...profile, totalHectares: toOptionalNumber(event.target.value) })} className={inputClass} />
            </label>

            <div className="mt-5 space-y-4">
              {profile.crops.map((crop, index) => (
                <div key={crop.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-gray-700">Cultivo {index + 1}</h4>
                    <button type="button" onClick={() => setProfile({ ...profile, crops: profile.crops.filter((item) => item.id !== crop.id) })} className="text-sm font-semibold text-red-600">Quitar</button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-sm text-gray-700">Tipo de cultivo
                      <input value={crop.cropType} onChange={(event) => updateCrop(crop.id, { cropType: event.target.value })} placeholder="Ej. Soya, maíz, arroz" className={inputClass} />
                    </label>
                    <label className="text-sm text-gray-700">Hectáreas sembradas
                      <input type="number" min="0" step="0.01" value={crop.plantedHectares ?? ''} onChange={(event) => updateCrop(crop.id, { plantedHectares: toOptionalNumber(event.target.value) })} className={inputClass} />
                    </label>
                    <label className="text-sm text-gray-700">Ha con nuestros materiales
                      <input type="number" min="0" step="0.01" value={crop.ourMaterialHectares ?? ''} onChange={(event) => updateCrop(crop.id, { ourMaterialHectares: toOptionalNumber(event.target.value) })} className={inputClass} />
                    </label>
                    <label className="text-sm text-gray-700">Datos del competidor
                      <input value={crop.competitorInfo || ''} onChange={(event) => updateCrop(crop.id, { competitorInfo: event.target.value })} placeholder="Empresa, marca o material" className={inputClass} />
                    </label>
                    <label className="text-sm text-gray-700">Población (plantas/ha)
                      <input type="number" min="0" step="1" value={crop.population ?? ''} onChange={(event) => updateCrop(crop.id, { population: toOptionalNumber(event.target.value) })} className={inputClass} />
                    </label>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <label className="text-sm text-gray-700">Rendimiento
                        <input type="number" min="0" step="0.01" value={crop.yieldValue ?? ''} onChange={(event) => updateCrop(crop.id, { yieldValue: toOptionalNumber(event.target.value) })} className={inputClass} />
                      </label>
                      <label className="text-sm text-gray-700">Unidad
                        <select value={crop.yieldUnit || 't/ha'} onChange={(event) => updateCrop(crop.id, { yieldUnit: event.target.value as CropProductionRecord['yieldUnit'] })} className={inputClass}>
                          <option value="t/ha">t/ha</option>
                          <option value="qq/ha">qq/ha</option>
                          <option value="kg/ha">kg/ha</option>
                        </select>
                      </label>
                    </div>
                    <label className="text-sm text-gray-700">Fecha de siembra
                      <input type="date" value={crop.plantingDate || ''} onChange={(event) => updateCrop(crop.id, { plantingDate: event.target.value })} className={inputClass} />
                    </label>
                    <label className="text-sm text-gray-700">Fecha de cosecha
                      <input type="date" value={crop.harvestDate || ''} onChange={(event) => updateCrop(crop.id, { harvestDate: event.target.value })} className={inputClass} />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setProfile({ ...profile, crops: [...profile.crops, createCropProductionRecord()] })} className="w-full rounded-lg border border-green-300 px-4 py-2 font-bold text-green-700 hover:bg-green-50 sm:w-auto">
                + Agregar cultivo
              </button>
              <button type="button" onClick={handleSaveAgriculture} disabled={isSaving} className="w-full rounded-lg bg-green-600 px-4 py-2 font-bold text-white disabled:bg-gray-400 sm:w-auto">
                {isSaving ? 'Guardando...' : 'Guardar información productiva'}
              </button>
            </div>
          </div>
        )}
      </section>

      {message && <p role="status" className={`rounded-lg p-3 text-sm ${message.includes('actualizada') ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>{message}</p>}
    </div>
  );
};

export default ClientProfileSections;
