'use client';

import { useState } from 'react';
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SEGMENT_TYPES,
  SEGMENT_TYPE_LABELS,
  type SegmentType,
  type SegmentDraft,
  type WorkoutType,
} from './_wizard-types';

function formatPace(secondsPerKm?: number): string {
  if (!secondsPerKm) return '';
  const min = Math.floor(secondsPerKm / 60);
  const sec = secondsPerKm % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function parsePace(pace: string): number | undefined {
  const match = pace.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return undefined;
  const min = parseInt(match[1], 10);
  const sec = parseInt(match[2], 10);
  if (sec >= 60) return undefined;
  return min * 60 + sec;
}

interface Props {
  prefill: SegmentDraft | null;
  segmentCount: number;
  workoutType: WorkoutType;
  onSave: (segment: SegmentDraft) => void;
  onCancel: () => void;
}

export function SectionForm({ prefill, segmentCount, workoutType, onSave, onCancel }: Props) {
  // interval_training uses meters; all other types use km
  const useMeters = workoutType === 'interval_training';

  const [segmentType, setSegmentType] = useState<SegmentType>(
    prefill?.segmentType ?? 'warmup',
  );
  const [measurement, setMeasurement] = useState<'distance' | 'time'>(
    prefill?.measurement ?? 'distance',
  );
  // distanceInput holds the value in the current unit (m or km) — converted on save
  const [distanceInput, setDistanceInput] = useState(() => {
    if (!prefill?.distanceMeters) return '';
    return useMeters
      ? String(prefill.distanceMeters)
      : String(prefill.distanceMeters / 1000);
  });
  const [durationMinutes, setDurationMinutes] = useState(
    String(prefill?.durationMinutes ?? ''),
  );
  const [intensity, setIntensity] = useState<'heart_rate' | 'pace'>(
    prefill?.intensity ?? 'heart_rate',
  );
  const [heartRateMin, setHeartRateMin] = useState(String(prefill?.heartRateMin ?? ''));
  const [heartRateMax, setHeartRateMax] = useState(String(prefill?.heartRateMax ?? ''));
  const [paceMin, setPaceMin] = useState(formatPace(prefill?.paceMinSecondsPerKm));
  const [paceMax, setPaceMax] = useState(formatPace(prefill?.paceMaxSecondsPerKm));
  const [repetitions, setRepetitions] = useState(String(prefill?.repetitions ?? '1'));
  const [notes, setNotes] = useState(prefill?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSave() {
    const errs: Record<string, string> = {};
    let distMeters: number | undefined;
    let durMinutes: number | undefined;
    let hrMin: number | undefined;
    let hrMax: number | undefined;
    let paceMinSec: number | undefined;
    let paceMaxSec: number | undefined;

    if (measurement === 'distance') {
      const raw = parseFloat(distanceInput);
      if (!distanceInput || isNaN(raw) || raw <= 0) {
        errs.distanceInput = `Podaj dystans w ${useMeters ? 'metrach' : 'km'}.`;
      } else {
        distMeters = useMeters ? Math.round(raw) : Math.round(raw * 1000);
      }
    } else {
      const val = parseInt(durationMinutes, 10);
      if (!durationMinutes || isNaN(val) || val < 1) {
        errs.durationMinutes = 'Podaj czas w minutach.';
      } else {
        durMinutes = val;
      }
    }

    if (intensity === 'heart_rate') {
      const minVal = parseInt(heartRateMin, 10);
      if (!heartRateMin || isNaN(minVal) || minVal < 1)
        errs.heartRateMin = 'Podaj minimalne tętno.';
      else hrMin = minVal;

      const maxVal = parseInt(heartRateMax, 10);
      if (!heartRateMax || isNaN(maxVal) || maxVal < 1)
        errs.heartRateMax = 'Podaj maksymalne tętno.';
      else hrMax = maxVal;
    } else {
      const minSec = parsePace(paceMin);
      if (!paceMin || minSec === undefined)
        errs.paceMin = 'Podaj tempo w formacie M:SS (np. 4:30).';
      else paceMinSec = minSec;

      const maxSec = parsePace(paceMax);
      if (!paceMax || maxSec === undefined)
        errs.paceMax = 'Podaj tempo w formacie M:SS (np. 5:00).';
      else paceMaxSec = maxSec;
    }

    const repsVal = parseInt(repetitions, 10);
    if (!repetitions || isNaN(repsVal) || repsVal < 1)
      errs.repetitions = 'Liczba powtórzeń musi być ≥ 1.';

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSave({
      segmentType,
      measurement,
      intensity,
      repetitions: repsVal,
      distanceMeters: distMeters,
      durationMinutes: durMinutes,
      heartRateMin: hrMin,
      heartRateMax: hrMax,
      paceMinSecondsPerKm: paceMinSec,
      paceMaxSecondsPerKm: paceMaxSec,
      notes,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Odcinek {segmentCount + 1}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Typ odcinka</Label>
          <Select
            value={segmentType}
            onValueChange={(val) => val && setSegmentType(val as SegmentType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(val: string) => SEGMENT_TYPE_LABELS[val as SegmentType]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SEGMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {SEGMENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Pomiar</Label>
            <Select
              value={measurement}
              onValueChange={(val) => val && setMeasurement(val as 'distance' | 'time')}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(val: string) => (val === 'distance' ? 'Dystans' : 'Czas')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Dystans</SelectItem>
                <SelectItem value="time">Czas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            {measurement === 'distance' ? (
              <>
                <Label htmlFor="distanceInput">
                  {useMeters ? 'Dystans (m)' : 'Dystans (km)'}
                </Label>
                <Input
                  id="distanceInput"
                  type="number"
                  min={useMeters ? 1 : 0.001}
                  step={useMeters ? 1 : 0.1}
                  value={distanceInput}
                  onChange={(e) => setDistanceInput(e.target.value)}
                  placeholder={useMeters ? '400' : '5'}
                />
                {errors.distanceInput && (
                  <p className="text-xs text-destructive">{errors.distanceInput}</p>
                )}
              </>
            ) : (
              <>
                <Label htmlFor="durationMinutes">Czas (min)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="30"
                />
                {errors.durationMinutes && (
                  <p className="text-xs text-destructive">{errors.durationMinutes}</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Intensywność</Label>
          <Select
            value={intensity}
            onValueChange={(val) => val && setIntensity(val as 'heart_rate' | 'pace')}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(val: string) => (val === 'heart_rate' ? 'Tętno' : 'Tempo')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heart_rate">Tętno</SelectItem>
              <SelectItem value="pace">Tempo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {intensity === 'heart_rate' ? (
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="heartRateMin">Tętno min (bpm)</Label>
              <Input
                id="heartRateMin"
                type="number"
                min={1}
                value={heartRateMin}
                onChange={(e) => setHeartRateMin(e.target.value)}
                placeholder="120"
              />
              {errors.heartRateMin && (
                <p className="text-xs text-destructive">{errors.heartRateMin}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="heartRateMax">Tętno max (bpm)</Label>
              <Input
                id="heartRateMax"
                type="number"
                min={1}
                value={heartRateMax}
                onChange={(e) => setHeartRateMax(e.target.value)}
                placeholder="140"
              />
              {errors.heartRateMax && (
                <p className="text-xs text-destructive">{errors.heartRateMax}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="paceMin">Tempo min (min/km)</Label>
              <Input
                id="paceMin"
                value={paceMin}
                onChange={(e) => setPaceMin(e.target.value)}
                placeholder="4:00"
              />
              {errors.paceMin && (
                <p className="text-xs text-destructive">{errors.paceMin}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="paceMax">Tempo max (min/km)</Label>
              <Input
                id="paceMax"
                value={paceMax}
                onChange={(e) => setPaceMax(e.target.value)}
                placeholder="4:30"
              />
              {errors.paceMax && (
                <p className="text-xs text-destructive">{errors.paceMax}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repetitions">Powtórzenia</Label>
          <Input
            id="repetitions"
            type="number"
            min={1}
            value={repetitions}
            onChange={(e) => setRepetitions(e.target.value)}
          />
          {errors.repetitions && (
            <p className="text-xs text-destructive">{errors.repetitions}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Uwagi (opcjonalnie)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opisz cel tego odcinka…"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          ← Wróć
        </Button>
        <Button onClick={handleSave}>Zapisz odcinek</Button>
      </DialogFooter>
    </>
  );
}
