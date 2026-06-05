'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrainingDetailsForm } from './_training-details-form';
import { SectionForm } from './_section-form';
import { SectionSummary } from './_section-summary';
import {
  createTrainingAction,
  updateTrainingAction,
  type CreateTrainingPayload,
  type UpdateTrainingPayload,
} from './actions';
import type { TrainingDetailsDraft, SegmentDraft } from './_wizard-types';
import type { WorkoutRow, SegmentRow } from '@/data';

type Step = 'details' | 'section' | 'summary';

function segmentRowToDraft(seg: SegmentRow): SegmentDraft {
  return {
    segmentType: seg.segmentType,
    measurement: seg.distanceMeters != null ? 'distance' : 'time',
    intensity: seg.heartRateMin != null || seg.heartRateMax != null ? 'heart_rate' : 'pace',
    repetitions: seg.repetitions,
    distanceMeters: seg.distanceMeters ?? undefined,
    durationMinutes: seg.durationMinutes ?? undefined,
    heartRateMin: seg.heartRateMin ?? undefined,
    heartRateMax: seg.heartRateMax ?? undefined,
    paceMinSecondsPerKm: seg.paceMinSecondsPerKm ?? undefined,
    paceMaxSecondsPerKm: seg.paceMaxSecondsPerKm ?? undefined,
    notes: seg.notes ?? '',
  };
}

function buildSegmentPayload(segs: SegmentDraft[]) {
  return segs.map((seg) => ({
    segmentType: seg.segmentType,
    repetitions: seg.repetitions,
    distanceMeters: seg.distanceMeters ?? null,
    durationMinutes: seg.durationMinutes ?? null,
    paceMinSecondsPerKm: seg.paceMinSecondsPerKm ?? null,
    paceMaxSecondsPerKm: seg.paceMaxSecondsPerKm ?? null,
    heartRateMin: seg.heartRateMin ?? null,
    heartRateMax: seg.heartRateMax ?? null,
    notes: seg.notes || null,
  }));
}

interface Props {
  athleteId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: string;
  dateReadOnly?: boolean;
  editWorkout?: WorkoutRow;
}

export function AddTrainingWizard({
  athleteId,
  open: controlledOpen,
  onOpenChange,
  defaultDate,
  dateReadOnly = false,
  editWorkout,
}: Props) {
  const router = useRouter();
  const isControlled = controlledOpen !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = isControlled ? (controlledOpen ?? false) : internalOpen;

  const [step, setStep] = useState<Step>('details');
  const [details, setDetails] = useState<TrainingDetailsDraft | null>(() =>
    editWorkout
      ? {
          scheduledDate: editWorkout.scheduledDate,
          workoutType: editWorkout.workoutType,
          title: editWorkout.title,
          notes: editWorkout.notes ?? '',
        }
      : null,
  );
  const [segments, setSegments] = useState<SegmentDraft[]>(() =>
    editWorkout ? editWorkout.segments.map(segmentRowToDraft) : [],
  );
  const [prefillSegment, setPrefillSegment] = useState<SegmentDraft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openWizard() {
    setStep('details');
    setDetails(null);
    setSegments([]);
    setPrefillSegment(null);
    setEditingIndex(null);
    setSaveError(null);
    setInternalOpen(true);
  }

  function closeWizard() {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
    }
  }

  /** Calls the create or update server action and closes on success. */
  async function saveToServer(d: TrainingDetailsDraft, segs: SegmentDraft[]) {
    setIsSaving(true);
    setSaveError(null);

    let result: { success: true } | { error: string };

    if (editWorkout) {
      const payload: UpdateTrainingPayload = {
        workoutId: editWorkout.id,
        athleteId,
        scheduledDate: d.scheduledDate,
        workoutType: d.workoutType,
        title: d.title || undefined,
        notes: d.notes || undefined,
        segments: buildSegmentPayload(segs),
      };
      result = await updateTrainingAction(payload);
    } else {
      const payload: CreateTrainingPayload = {
        athleteId,
        scheduledDate: d.scheduledDate,
        workoutType: d.workoutType,
        title: d.title || undefined,
        notes: d.notes || undefined,
        segments: buildSegmentPayload(segs),
      };
      result = await createTrainingAction(payload);
    }

    setIsSaving(false);
    if ('success' in result) {
      closeWizard();
      router.refresh();
    } else {
      setSaveError(result.error);
    }
  }

  // ── Step navigation ──────────────────────────────────────────────────────

  function handleDetailsNext(d: TrainingDetailsDraft) {
    setDetails(d);
    if (editWorkout && segments.length > 0) {
      setEditingIndex(0);
      setPrefillSegment(segments[0]);
    } else {
      setEditingIndex(null);
      setPrefillSegment(null);
    }
    setStep('section');
  }

  function handleSegmentSave(seg: SegmentDraft) {
    if (editingIndex !== null) {
      const total = segments.length;
      setSegments((prev) => {
        const updated = [...prev];
        updated[editingIndex] = seg;
        return updated;
      });
      const nextIndex = editingIndex + 1;
      if (nextIndex < total) {
        setEditingIndex(nextIndex);
        setPrefillSegment(segments[nextIndex]);
      } else {
        setEditingIndex(null);
        setPrefillSegment(null);
        setStep('summary');
      }
    } else {
      setSegments((prev) => [...prev, seg]);
      setPrefillSegment(null);
      setStep('summary');
    }
  }

  function handleGoBack() {
    const last = segments[segments.length - 1];
    setSegments((prev) => prev.slice(0, -1));
    setPrefillSegment(last);
    setEditingIndex(null);
    setStep('section');
  }

  function handleAddAnother() {
    setPrefillSegment(null);
    setEditingIndex(null);
    setStep('section');
  }

  function handleSectionCancel() {
    if (editingIndex !== null) {
      if (editingIndex > 0) {
        const prevIndex = editingIndex - 1;
        setEditingIndex(prevIndex);
        setPrefillSegment(segments[prevIndex]);
      } else {
        setEditingIndex(null);
        setPrefillSegment(null);
        setStep('details');
      }
      return;
    }
    if (prefillSegment !== null) {
      setSegments((prev) => [...prev, prefillSegment]);
      setPrefillSegment(null);
      setStep('summary');
    } else if (segments.length > 0) {
      setStep('summary');
    } else {
      setStep('details');
    }
  }

  // ── "Zapisz zmiany" — save from any step ────────────────────────────────

  async function handleSaveFromDetails(d: TrainingDetailsDraft) {
    setDetails(d);
    await saveToServer(d, segments);
  }

  async function handleSaveFromSection(seg: SegmentDraft) {
    if (!details) return;
    const finalSegments = [...segments];
    if (editingIndex !== null) {
      finalSegments[editingIndex] = seg;
    } else {
      finalSegments.push(seg);
    }
    setSegments(finalSegments);
    await saveToServer(details, finalSegments);
  }

  async function handleSave() {
    if (!details) return;
    await saveToServer(details, segments);
  }

  // ────────────────────────────────────────────────────────────────────────

  const isEditMode = !!editWorkout;

  return (
    <>
      {!isControlled && (
        <Button onClick={openWizard}>Dodaj trening</Button>
      )}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeWizard()}>
        <DialogContent className="sm:max-w-md">
          {step === 'details' && (
            <TrainingDetailsForm
              prefill={details ?? undefined}
              defaultDate={defaultDate}
              dateReadOnly={dateReadOnly}
              onNext={handleDetailsNext}
              onSaveAndFinish={isEditMode ? handleSaveFromDetails : undefined}
              isSaving={isSaving}
              saveError={saveError}
            />
          )}
          {step === 'section' && details && (
            <SectionForm
              prefill={prefillSegment}
              segmentCount={editingIndex ?? segments.length}
              totalSegments={editingIndex !== null ? segments.length : undefined}
              workoutType={details.workoutType}
              onSave={handleSegmentSave}
              onCancel={handleSectionCancel}
              onSaveAndFinish={isEditMode ? handleSaveFromSection : undefined}
              isSaving={isSaving}
              saveError={saveError}
            />
          )}
          {step === 'summary' && (
            <SectionSummary
              segments={segments}
              isSaving={isSaving}
              error={saveError}
              onGoBack={handleGoBack}
              onAddAnother={handleAddAnother}
              onSave={handleSave}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
