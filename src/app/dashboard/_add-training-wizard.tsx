'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrainingDetailsForm } from './_training-details-form';
import { SectionForm } from './_section-form';
import { SectionSummary } from './_section-summary';
import { createTrainingAction, type CreateTrainingPayload } from './actions';
import type { TrainingDetailsDraft, SegmentDraft } from './_wizard-types';

type Step = 'details' | 'section' | 'summary';

interface Props {
  athleteId: string;
}

export function AddTrainingWizard({ athleteId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [details, setDetails] = useState<TrainingDetailsDraft | null>(null);
  const [segments, setSegments] = useState<SegmentDraft[]>([]);
  const [prefillSegment, setPrefillSegment] = useState<SegmentDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openWizard() {
    setStep('details');
    setDetails(null);
    setSegments([]);
    setPrefillSegment(null);
    setSaveError(null);
    setIsOpen(true);
  }

  function closeWizard() {
    setIsOpen(false);
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
      // We're editing the last segment — restore it unchanged and go to summary
      setSegments((prev) => [...prev, prefillSegment]);
      setPrefillSegment(null);
      setStep('summary');
    } else if (segments.length > 0) {
      // Adding a new section to an existing list — discard and go to summary
      setStep('summary');
    } else {
      // First section — go back to training details
      setStep('details');
    }
  }

  async function handleSave() {
    if (!details) return;
    setIsSaving(true);
    setSaveError(null);

    const payload: CreateTrainingPayload = {
      athleteId,
      scheduledDate: details.scheduledDate,
      workoutType: details.workoutType,
      title: details.title || undefined,
      notes: details.notes || undefined,
      segments: segments.map((seg) => ({
        segmentType: seg.segmentType,
        repetitions: seg.repetitions,
        distanceMeters: seg.distanceMeters ?? null,
        durationMinutes: seg.durationMinutes ?? null,
        paceMinSecondsPerKm: seg.paceMinSecondsPerKm ?? null,
        paceMaxSecondsPerKm: seg.paceMaxSecondsPerKm ?? null,
        heartRateMin: seg.heartRateMin ?? null,
        heartRateMax: seg.heartRateMax ?? null,
        notes: seg.notes || null,
      })),
    };

    const result = await createTrainingAction(payload);
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
      <Button onClick={openWizard}>Dodaj trening</Button>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeWizard()}>
        <DialogContent className="sm:max-w-md">
          {step === 'details' && <TrainingDetailsForm onNext={handleDetailsNext} />}
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
