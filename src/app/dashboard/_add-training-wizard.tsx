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

interface Props {
  athleteId: string;
  /** Controlled open state. When provided the internal button is hidden. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pre-fill the date and lock it (add-from-row). */
  defaultDate?: string;
  dateReadOnly?: boolean;
  /** Pre-fill the entire form for editing an existing workout. */
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openWizard() {
    setStep('details');
    setDetails(null);
    setSegments([]);
    setPrefillSegment(null);
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

  function handleDetailsNext(d: TrainingDetailsDraft) {
    setDetails(d);
    setPrefillSegment(null);
    setStep('section');
  }

  function handleSegmentSave(seg: SegmentDraft) {
    setSegments((prev) => [...prev, seg]);
    setPrefillSegment(null);
    setStep('summary');
  }

  function handleGoBack() {
    const last = segments[segments.length - 1];
    setSegments((prev) => prev.slice(0, -1));
    setPrefillSegment(last);
    setStep('section');
  }

  function handleAddAnother() {
    setPrefillSegment(null);
    setStep('section');
  }

  function handleSectionCancel() {
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

  async function handleSave() {
    if (!details) return;
    setIsSaving(true);
    setSaveError(null);

    const segmentPayload = segments.map((seg) => ({
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

    let result: { success: true } | { error: string };

    if (editWorkout) {
      const payload: UpdateTrainingPayload = {
        workoutId: editWorkout.id,
        athleteId,
        scheduledDate: details.scheduledDate,
        workoutType: details.workoutType,
        title: details.title || undefined,
        notes: details.notes || undefined,
        segments: segmentPayload,
      };
      result = await updateTrainingAction(payload);
    } else {
      const payload: CreateTrainingPayload = {
        athleteId,
        scheduledDate: details.scheduledDate,
        workoutType: details.workoutType,
        title: details.title || undefined,
        notes: details.notes || undefined,
        segments: segmentPayload,
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
            />
          )}
          {step === 'section' && details && (
            <SectionForm
              prefill={prefillSegment}
              segmentCount={segments.length}
              workoutType={details.workoutType}
              onSave={handleSegmentSave}
              onCancel={handleSectionCancel}
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
