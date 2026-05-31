'use server';

import { updateAthleteCustomName } from '@/data';

export async function updateAthleteCustomNameAction(
  athleteId: string,
  customName: string,
): Promise<{ success: true } | { error: string }> {
  try {
    await updateAthleteCustomName(athleteId, customName);
    return { success: true };
  } catch {
    return { error: 'Nie udało się zapisać nazwy.' };
  }
}
