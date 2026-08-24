import React, { useEffect, useState } from 'react';
import { Client } from '../types';
import * as api from '../services/api';
import { getAgriculturalProfile } from '../utils/clientAgriculture';

interface ClientProfileSectionsProps {
  client: Client;
  isOnline: boolean;
  onUpdateClient: (client: Client) => void;
}

const inputClass = 'mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-green-500 focus:ring-green-500';
const valueOrPending = (value: string | number | undefined, suffix = '') => (
  value === undefined || value === '' ? 'No registrado' : `${value}${suffix}`
);

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
  const profile = getAgriculturalProfile(client.agriculturalProfile, client.crops);

  useEffect(() => {
    setBasic({
      name: client.name,
      farmName: client.farmName,
      contactPerson: client.contactPerson,
      phone: client.phone,
      address: client.address,
    });
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
              {profile.crops.length > 0 ? `${profile.crops.length} cultivo(s) en el último relevamiento` : 'Todavía no existe un relevamiento productivo.'}
            </p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
            {showAgriculture ? '−' : '+'}
          </span>
        </button>

        {showAgriculture && (
          <div className="border-t border-green-100 p-4 sm:p-6">
            <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              Este resumen se actualiza desde el relevamiento realizado en cada visita.
            </p>

            {profile.crops.length === 0 ? (
              <p className="text-sm text-gray-500">Completa el primer relevamiento desde una visita del cliente.</p>
            ) : (
              <>
                <p className="mb-4 text-sm"><span className="block text-xs text-gray-400">Superficie total</span>{valueOrPending(profile.totalHectares, ' ha')}</p>
                <div className="space-y-3">
                  {profile.crops.map((crop) => (
                    <div key={crop.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h4 className="font-bold text-gray-800">{crop.cropType || 'Cultivo sin nombre'}</h4>
                      <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <p><span className="block text-xs text-gray-400">Hectáreas sembradas</span>{valueOrPending(crop.plantedHectares, ' ha')}</p>
                        <p><span className="block text-xs text-gray-400">Con nuestros materiales</span>{valueOrPending(crop.ourMaterialHectares, ' ha')}</p>
                        <p><span className="block text-xs text-gray-400">Competidor</span>{valueOrPending(crop.competitorInfo)}</p>
                        <p><span className="block text-xs text-gray-400">Población</span>{valueOrPending(crop.population, ' plantas/ha')}</p>
                        <p><span className="block text-xs text-gray-400">Rendimiento</span>{valueOrPending(crop.yieldValue, ` ${crop.yieldUnit || 't/ha'}`)}</p>
                        <p><span className="block text-xs text-gray-400">Siembra / cosecha</span>{valueOrPending(crop.plantingDate)} / {valueOrPending(crop.harvestDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {message && <p role="status" className={`rounded-lg p-3 text-sm ${message.includes('actualizada') ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>{message}</p>}
    </div>
  );
};

export default ClientProfileSections;
