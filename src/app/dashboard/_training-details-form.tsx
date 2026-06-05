'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
  WORKOUT_TYPES,
  WORKOUT_TYPE_LABELS,
  type WorkoutType,
  type TrainingDetailsDraft,
} from './_wizard-types';

interface Props {
  prefill?: TrainingDetailsDraft;
  defaultDate?: string;
  dateReadOnly?: boolean;
  onNext: (details: TrainingDetailsDraft) => void;
  /** Present in edit mode — saves immediately and closes the wizard. */
  onSaveAndFinish?: (details: TrainingDetailsDraft) => void;
  isSaving?: boolean;
  saveError?: string | null;
}

export function TrainingDetailsForm({
  prefill,
  defaultDate,
  dateReadOnly = false,
  onNext,
  onSaveAndFinish,
  isSaving = false,
  saveError,
}: Props) {
  const [scheduledDate, setScheduledDate] = useState(
    () => prefill?.scheduledDate ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'),
  );
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(
    prefill?.workoutType ?? null,
  );
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): TrainingDetailsDraft | null {
    const errs: Record<string, string> = {};
    if (!scheduledDate) errs.scheduledDate = 'Data jest wymagana.';
    if (!workoutType) errs.workoutType = 'Typ treningu jest wymagany.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return null;
    return { scheduledDate, workoutType: workoutType!, title, notes };
  }

  function handleNext() {
    const d = validate();
    if (d) onNext(d);
  }

  function handleSaveAndFinish() {
    const d = validate();
    if (d) onSaveAndFinish!(d);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {prefill ? 'Edytuj trening — szczegóły' : 'Nowy trening — szczegóły'}
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduledDate">Data</Label>
          <Input
            id="scheduledDate"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            disabled={dateReadOnly}
          />
          {dateReadOnly && (
            <p className="text-xs text-muted-foreground">Data jest ustalona dla tego dnia.</p>
          )}
          {errors.scheduledDate && (
            <p className="text-xs text-destructive">{errors.scheduledDate}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Typ treningu</Label>
          <Select
            value={workoutType}
            onValueChange={(val) => val && setWorkoutType(val as WorkoutType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz typ treningu">
                {(val: string | null) =>
                  val ? WORKOUT_TYPE_LABELS[val as WorkoutType] : null
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {WORKOUT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.workoutType && (
            <p className="text-xs text-destructive">{errors.workoutType}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Tytuł (opcjonalnie)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Długi bieg niedzielny"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Uwagi ogólne (opcjonalnie)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dodaj uwagi do całego treningu…"
          />
        </div>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>
      <DialogFooter className={onSaveAndFinish ? 'sm:justify-between' : undefined}>
        {onSaveAndFinish && (
          <Button variant="outline" onClick={handleSaveAndFinish} disabled={isSaving}>
            {isSaving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        )}
        <Button onClick={handleNext} disabled={isSaving}>Dalej →</Button>
      </DialogFooter>
    </>
  );
}
