import { describe, expect, it } from 'vitest';
import {
  cropNamesFromProfile,
  ensureAgriculturalProfileHasCrop,
  getAgriculturalProfile,
  validateAgriculturalProfile,
} from './clientAgriculture';

describe('client agriculture', () => {
  it('convierte los cultivos heredados en registros editables', () => {
    const profile = getAgriculturalProfile(undefined, ['Soya', 'Maíz']);
    expect(profile.crops.map((crop) => crop.cropType)).toEqual(['Soya', 'Maíz']);
  });

  it('impide registrar más hectáreas propias que hectáreas sembradas', () => {
    const errors = validateAgriculturalProfile({
      totalHectares: 100,
      crops: [{
        id: 'soya',
        cropType: 'Soya',
        plantedHectares: 40,
        ourMaterialHectares: 50,
      }],
    });
    expect(errors.join(' ')).toContain('no pueden superar');
  });

  it('mantiene varios tipos de cultivo sin duplicarlos', () => {
    expect(cropNamesFromProfile({
      crops: [
        { id: '1', cropType: 'Soya' },
        { id: '2', cropType: 'Maíz' },
        { id: '3', cropType: 'Soya' },
      ],
    })).toEqual(['Soya', 'Maíz']);
  });

  it('muestra un cultivo vacío al abrir una ficha productiva sin cultivos', () => {
    const profile = ensureAgriculturalProfileHasCrop({ crops: [] });

    expect(profile.crops).toHaveLength(1);
    expect(profile.crops[0].cropType).toBe('');
    expect(profile.crops[0].yieldUnit).toBe('t/ha');
  });
});
