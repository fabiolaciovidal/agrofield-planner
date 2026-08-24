import { AgriculturalProfile, CropProductionRecord } from '../types';

export const createCropProductionRecord = (cropType = ''): CropProductionRecord => ({
  id: `crop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  cropType,
  yieldUnit: 't/ha',
});

export const getAgriculturalProfile = (
  profile: AgriculturalProfile | undefined,
  legacyCrops: string[] = []
): AgriculturalProfile => {
  if (profile?.crops) {
    return {
      totalHectares: profile.totalHectares,
      crops: profile.crops.map((crop) => ({ ...crop })),
    };
  }

  return {
    crops: legacyCrops.map((crop) => createCropProductionRecord(crop)),
  };
};

export const validateAgriculturalProfile = (profile: AgriculturalProfile): string[] => {
  const errors: string[] = [];
  if (profile.totalHectares !== undefined && profile.totalHectares < 0) {
    errors.push('La superficie total no puede ser negativa.');
  }

  profile.crops.forEach((crop, index) => {
    const label = crop.cropType.trim() || `Cultivo ${index + 1}`;
    if (!crop.cropType.trim()) errors.push(`Debes indicar el tipo de ${label.toLowerCase()}.`);

    const numericFields: Array<[number | undefined, string]> = [
      [crop.plantedHectares, 'hectáreas sembradas'],
      [crop.ourMaterialHectares, 'hectáreas con nuestros materiales'],
      [crop.population, 'población'],
      [crop.yieldValue, 'rendimiento'],
    ];
    numericFields.forEach(([value, field]) => {
      if (value !== undefined && value < 0) errors.push(`${label}: ${field} no puede ser negativo.`);
    });

    if (
      crop.plantedHectares !== undefined
      && crop.ourMaterialHectares !== undefined
      && crop.ourMaterialHectares > crop.plantedHectares
    ) {
      errors.push(`${label}: las hectáreas con nuestros materiales no pueden superar las sembradas.`);
    }

    if (crop.plantingDate && crop.harvestDate && crop.harvestDate < crop.plantingDate) {
      errors.push(`${label}: la fecha de cosecha no puede ser anterior a la siembra.`);
    }
  });

  return errors;
};

export const cropNamesFromProfile = (profile: AgriculturalProfile): string[] => (
  [...new Set(profile.crops.map((crop) => crop.cropType.trim()).filter(Boolean))]
);

export const ensureAgriculturalProfileHasCrop = (profile: AgriculturalProfile): AgriculturalProfile => (
  profile.crops.length > 0
    ? profile
    : { ...profile, crops: [createCropProductionRecord()] }
);
