import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getGymProfileSync } from '../hooks/useGymProfile';

export const KG_TO_LBS = 2.2046226218;

export function getUnitIsLbsSync(): boolean {
  return Boolean(getGymProfileSync()?.unitIsLbs);
}

export function useWeightUnit(): boolean {
  const [unitIsLbs, setUnitIsLbs] = useState<boolean>(() => getUnitIsLbsSync());

  useEffect(() => {
    const subUnit = DeviceEventEmitter.addListener('weight_unit_changed', (next: boolean) => {
      setUnitIsLbs(prev => prev === Boolean(next) ? prev : Boolean(next));
    });
    const subProf = DeviceEventEmitter.addListener('gym_profile_updated', (p: any) => {
      if (p && typeof p.unitIsLbs === 'boolean') {
        setUnitIsLbs(prev => prev === p.unitIsLbs ? prev : p.unitIsLbs);
      }
    });
    return () => {
      subUnit.remove();
      subProf.remove();
    };
  }, []);

  return unitIsLbs;
}

export function unitLabel(unitIsLbs: boolean = getUnitIsLbsSync()): 'lbs' | 'kg' {
  return unitIsLbs ? 'lbs' : 'kg';
}

export function kgToDisplay(kg: number, unitIsLbs: boolean = getUnitIsLbsSync(), decimals: number = 1): number {
  if (!Number.isFinite(kg)) return 0;
  if (!unitIsLbs) {
    const factor = Math.pow(10, decimals);
    return Math.round(kg * factor) / factor;
  }
  const factor = Math.pow(10, decimals);
  return Math.round(kg * KG_TO_LBS * factor) / factor;
}

export function displayToKg(value: number, unitIsLbs: boolean = getUnitIsLbsSync()): number {
  if (!Number.isFinite(value)) return 0;
  if (!unitIsLbs) return Math.round(value * 10) / 10;
  return Math.round((value / KG_TO_LBS) * 100) / 100;
}

export function formatWeight(
  kg: number | null | undefined,
  unitIsLbs: boolean = getUnitIsLbsSync(),
  decimals: number = 1
): string {
  if (kg == null || !Number.isFinite(kg) || kg <= 0) return '—';
  const factor = Math.pow(10, decimals);
  const val = unitIsLbs
    ? Math.round(kg * KG_TO_LBS * factor) / factor
    : Math.round(kg * factor) / factor;
  return `${val} ${unitIsLbs ? 'lbs' : 'kg'}`;
}

export function formatVolumeParts(
  volumeKg: number,
  unitIsLbs: boolean = getUnitIsLbsSync()
): { numStr: string; suffix: string; full: string } {
  const raw = unitIsLbs ? Math.round(volumeKg * KG_TO_LBS) : Math.round(volumeKg);
  const unit = unitIsLbs ? 'lbs' : 'kg';
  if (raw >= 1000000) {
    const numStr = `${(raw / 1000000).toFixed(1)}M`;
    return { numStr, suffix: unit, full: `${numStr} ${unit}` };
  }
  if (raw >= 1000) {
    const numStr = `${(raw / 1000).toFixed(1)}k`;
    return { numStr, suffix: unit, full: `${numStr} ${unit}` };
  }
  const numStr = `${raw}`;
  return { numStr, suffix: unit, full: `${numStr} ${unit}` };
}
