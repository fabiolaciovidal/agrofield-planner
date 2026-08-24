import React from 'react';
import { AgriculturalProfile, CropProductionRecord } from '../types';
import { createCropProductionRecord } from '../utils/clientAgriculture';

interface AgriculturalProfileFormProps {
  profile: AgriculturalProfile;
  onChange: (profile: AgriculturalProfile) => void;
  disabled?: boolean;
}

const inputClass = 'mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500';

const toOptionalNumber = (value: string): number | undefined => value === '' ? undefined : Number(value);

const AgriculturalProfileForm: React.FC<AgriculturalProfileFormProps> = ({ profile, onChange, disabled = false }) => {
  const updateCrop = (id: string, changes: Partial<CropProductionRecord>) => {
    onChange({
      ...profile,
      crops: profile.crops.map((crop) => crop.id === id ? { ...crop, ...changes } : crop),
    });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm text-gray-700">Superficie total del cliente (ha)
        <input
          type="number"
          min="0"
          step="0.01"
          value={profile.totalHectares ?? ''}
          disabled={disabled}
          onChange={(event) => onChange({ ...profile, totalHectares: toOptionalNumber(event.target.value) })}
          className={inputClass}
        />
      </label>

      {profile.crops.map((crop, index) => (
        <div key={crop.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="font-bold text-gray-700">Cultivo {index + 1}</h4>
            {!disabled && profile.crops.length > 1 && (
              <button
                type="button"
                onClick={() => onChange({ ...profile, crops: profile.crops.filter((item) => item.id !== crop.id) })}
                className="shrink-0 text-sm font-semibold text-red-600"
              >
                Quitar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-700">Tipo de cultivo
              <input disabled={disabled} value={crop.cropType} onChange={(event) => updateCrop(crop.id, { cropType: event.target.value })} placeholder="Ej. Soya, maíz, arroz" className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Hectáreas sembradas
              <input disabled={disabled} type="number" min="0" step="0.01" value={crop.plantedHectares ?? ''} onChange={(event) => updateCrop(crop.id, { plantedHectares: toOptionalNumber(event.target.value) })} className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Ha con nuestros materiales
              <input disabled={disabled} type="number" min="0" step="0.01" value={crop.ourMaterialHectares ?? ''} onChange={(event) => updateCrop(crop.id, { ourMaterialHectares: toOptionalNumber(event.target.value) })} className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Datos del competidor
              <input disabled={disabled} value={crop.competitorInfo || ''} onChange={(event) => updateCrop(crop.id, { competitorInfo: event.target.value })} placeholder="Empresa, marca o material" className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Población (plantas/ha)
              <input disabled={disabled} type="number" min="0" step="1" value={crop.population ?? ''} onChange={(event) => updateCrop(crop.id, { population: toOptionalNumber(event.target.value) })} className={inputClass} />
            </label>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
              <label className="min-w-0 text-sm text-gray-700">Rendimiento
                <input disabled={disabled} type="number" min="0" step="0.01" value={crop.yieldValue ?? ''} onChange={(event) => updateCrop(crop.id, { yieldValue: toOptionalNumber(event.target.value) })} className={inputClass} />
              </label>
              <label className="text-sm text-gray-700">Unidad
                <select disabled={disabled} value={crop.yieldUnit || 't/ha'} onChange={(event) => updateCrop(crop.id, { yieldUnit: event.target.value as CropProductionRecord['yieldUnit'] })} className={inputClass}>
                  <option value="t/ha">t/ha</option>
                  <option value="qq/ha">qq/ha</option>
                  <option value="kg/ha">kg/ha</option>
                </select>
              </label>
            </div>
            <label className="text-sm text-gray-700">Fecha de siembra
              <input disabled={disabled} type="date" value={crop.plantingDate || ''} onChange={(event) => updateCrop(crop.id, { plantingDate: event.target.value })} className={inputClass} />
            </label>
            <label className="text-sm text-gray-700">Fecha de cosecha
              <input disabled={disabled} type="date" value={crop.harvestDate || ''} onChange={(event) => updateCrop(crop.id, { harvestDate: event.target.value })} className={inputClass} />
            </label>
          </div>
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange({ ...profile, crops: [...profile.crops, createCropProductionRecord()] })}
          className="w-full rounded-lg border border-green-300 px-4 py-2 font-bold text-green-700 hover:bg-green-50 sm:w-auto"
        >
          + Agregar otro cultivo
        </button>
      )}
    </div>
  );
};

export default AgriculturalProfileForm;
