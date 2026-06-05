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
  onNext: (details: TrainingDetailsDraft) => void;
}

export function TrainingDetailsForm({ onNext }: Props) {
  const [scheduledDate, setScheduledDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleNext() {
    const errs: Record<string, string> = {};
    if (!scheduledDate) errs.scheduledDate = 'Data jest wymagana.';
    if (!workoutType) errs.workoutType = 'Typ treningu jest wymagany.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onNext({ scheduledDate, workoutType: workoutType!, title, notes });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nowy trening — szczegóły</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduledDate">Data</Label>
          <Input
            id="scheduledDate"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
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
              <SelectValue placeholder="Wybierz typ treningu" />
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
      </div>
      <DialogFooter>
        <Button onClick={handleNext}>Dalej →</Button>
      </DialogFooter>
    </>
  );
}
