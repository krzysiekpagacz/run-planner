'use client';

import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SEGMENT_TYPE_LABELS, type SegmentDraft } from './_wizard-types';

function formatSegmentSummary(seg: SegmentDraft): string {
  const parts: string[] = [];

  if (seg.measurement === 'distance' && seg.distanceMeters) {
    const dist =
      seg.distanceMeters >= 1000
        ? `${(seg.distanceMeters / 1000).toFixed(seg.distanceMeters % 1000 === 0 ? 0 : 1)} km`
        : `${seg.distanceMeters} m`;
    parts.push(seg.repetitions > 1 ? `${seg.repetitions}× ${dist}` : dist);
  } else if (seg.measurement === 'time' && seg.durationMinutes) {
    parts.push(`${seg.durationMinutes} min`);
  }

  if (seg.intensity === 'heart_rate' && seg.heartRateMin && seg.heartRateMax) {
    parts.push(`Tętno ${seg.heartRateMin}–${seg.heartRateMax} bpm`);
  } else if (
    seg.intensity === 'pace' &&
    seg.paceMinSecondsPerKm &&
    seg.paceMaxSecondsPerKm
  ) {
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    parts.push(
      `Tempo ${fmt(seg.paceMinSecondsPerKm)}–${fmt(seg.paceMaxSecondsPerKm)} min/km`,
    );
  }

  return parts.join(' · ');
}

function totalDistanceLabel(segments: SegmentDraft[]): string | null {
  const meters = segments.reduce(
    (sum, seg) =>
      seg.measurement === 'distance'
        ? sum + (seg.distanceMeters ?? 0) * seg.repetitions
        : sum,
    0,
  );
  if (!meters) return null;
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(2)} km`;
  }
  return `${meters} m`;
}

interface Props {
  segments: SegmentDraft[];
  isSaving: boolean;
  error: string | null;
  onGoBack: () => void;
  onAddAnother: () => void;
  onSave: () => void;
}

export function SectionSummary({
  segments,
  isSaving,
  error,
  onGoBack,
  onAddAnother,
  onSave,
}: Props) {
  const totalDist = totalDistanceLabel(segments);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Podsumowanie treningu</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <ol className="flex flex-col gap-2">
          {segments.map((seg, i) => (
            <li key={i} className="flex flex-col gap-0.5 rounded-lg border p-3">
              <span className="text-sm font-medium">
                {i + 1}. {SEGMENT_TYPE_LABELS[seg.segmentType]}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatSegmentSummary(seg)}
              </span>
              {seg.notes && (
                <span className="text-xs italic text-muted-foreground">{seg.notes}</span>
              )}
            </li>
          ))}
        </ol>
        {totalDist && (
          <p className="text-sm">
            Łączny dystans:{' '}
            <span className="font-medium">{totalDist}</span>
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter className="sm:justify-between">
        <Button variant="outline" onClick={onGoBack} disabled={isSaving}>
          ← Wróć i edytuj
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAddAnother} disabled={isSaving}>
            + Dodaj odcinek
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Zapisywanie…' : '✓ Zapisz trening'}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
