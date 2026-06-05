'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameDay,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { WorkoutRow, SegmentRow } from '@/data';
import { SEGMENT_TYPE_LABELS } from './_wizard-types';
import { AddTrainingWizard } from './_add-training-wizard';
import {
  deleteTrainingAction,
  updateWorkoutNotesAction,
  updateSegmentNotesAction,
} from './actions';

type WorkoutType = WorkoutRow['workoutType'];

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  easy_run: 'Łatwy bieg',
  tempo_run: 'Tempo',
  interval_training: 'Interwały',
  long_run: 'Długi bieg',
  race: 'Zawody',
  rest: 'Odpoczynek',
  cross_training: 'Trening uzupełniający',
  strength: 'Siłownia',
  fartlek: 'Fartlek',
  hill_workout: 'Podbiegi',
};

const WORKOUT_TYPE_CLASSES: Record<WorkoutType, string> = {
  easy_run: 'bg-green-100 text-green-800 hover:bg-green-100',
  tempo_run: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  interval_training: 'bg-red-100 text-red-800 hover:bg-red-100',
  long_run: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  race: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  rest: 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  cross_training: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
  strength: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  fartlek: 'bg-pink-100 text-pink-800 hover:bg-pink-100',
  hill_workout: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

function fmtPace(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function segmentMetric(seg: SegmentRow): string {
  const parts: string[] = [];

  if (seg.distanceMeters != null) {
    const dist =
      seg.distanceMeters >= 1000
        ? `${(seg.distanceMeters / 1000).toFixed(seg.distanceMeters % 1000 === 0 ? 0 : 1)} km`
        : `${seg.distanceMeters} m`;
    parts.push(seg.repetitions > 1 ? `${seg.repetitions}× ${dist}` : dist);
  } else if (seg.durationMinutes != null) {
    parts.push(`${seg.durationMinutes} min`);
  }

  if (seg.heartRateMin != null && seg.heartRateMax != null) {
    parts.push(`${seg.heartRateMin}–${seg.heartRateMax} bpm`);
  } else if (seg.paceMinSecondsPerKm != null && seg.paceMaxSecondsPerKm != null) {
    parts.push(`${fmtPace(seg.paceMinSecondsPerKm)}–${fmtPace(seg.paceMaxSecondsPerKm)} /km`);
  }

  return parts.join(' · ');
}

function isCompleted(scheduledDate: Date): boolean {
  return isBefore(scheduledDate, startOfDay(new Date()));
}

type ViewMode = 'month' | 'week';
const WEEK_OPTS = { weekStartsOn: 1 } as const;

type TableAction =
  | { type: 'add'; date: string }
  | { type: 'edit'; workout: WorkoutRow }
  | { type: 'delete'; workout: WorkoutRow }
  | null;

type EditingNote =
  | { type: 'workout'; workoutId: string; current: string }
  | { type: 'segment'; segmentId: string; label: string; current: string };

interface Props {
  workouts: WorkoutRow[];
  /** When provided, coach CRUD action icons are shown for each row. */
  athleteId?: string;
}

export function MonthlyTrainingTable({ workouts, athleteId }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [action, setAction] = useState<TableAction>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingNote, setEditingNote] = useState<EditingNote | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const days =
    viewMode === 'week'
      ? eachDayOfInterval({
          start: startOfWeek(month, WEEK_OPTS),
          end: endOfWeek(month, WEEK_OPTS),
        })
      : eachDayOfInterval({
          start: startOfMonth(month),
          end: endOfMonth(month),
        });

  const title =
    viewMode === 'week'
      ? `${format(startOfWeek(month, WEEK_OPTS), 'dd.MM.yyyy')} – ${format(endOfWeek(month, WEEK_OPTS), 'dd.MM.yyyy')}`
      : format(month, 'MMMM yyyy');

  function openNoteEdit(note: EditingNote) {
    setNoteDraft(note.current);
    setEditingNote(note);
  }

  async function handleSaveNote() {
    if (!editingNote) return;
    setIsSavingNote(true);
    const notes = noteDraft.trim() || null;
    const result =
      editingNote.type === 'workout'
        ? await updateWorkoutNotesAction({ workoutId: editingNote.workoutId, notes })
        : await updateSegmentNotesAction({ segmentId: editingNote.segmentId, notes });
    setIsSavingNote(false);
    if ('success' in result) {
      setEditingNote(null);
      router.refresh();
    }
  }

  async function handleDeleteNote(
    note: { type: 'workout'; workoutId: string } | { type: 'segment'; segmentId: string },
  ) {
    if (note.type === 'workout') {
      await updateWorkoutNotesAction({ workoutId: note.workoutId, notes: null });
    } else {
      await updateSegmentNotesAction({ segmentId: note.segmentId, notes: null });
    }
    router.refresh();
  }

  function toggleView() {
    if (viewMode === 'month') {
      setViewMode('week');
      setMonth(startOfWeek(new Date(), WEEK_OPTS));
    } else {
      setViewMode('month');
      setMonth(startOfMonth(new Date()));
    }
  }

  async function handleDelete() {
    if (action?.type !== 'delete') return;
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteTrainingAction({ workoutId: action.workout.id });
    setIsDeleting(false);
    if ('success' in result) {
      setAction(null);
      router.refresh();
    } else {
      setDeleteError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="outline" onClick={toggleView}>
          {viewMode === 'month' ? 'Widok tygodniowy' : 'Widok miesięczny'}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setMonth((m) => (viewMode === 'week' ? subWeeks(m, 1) : subMonths(m, 1)))
                }
                aria-label={viewMode === 'week' ? 'Poprzedni tydzień' : 'Poprzedni miesiąc'}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setMonth((m) => (viewMode === 'week' ? addWeeks(m, 1) : addMonths(m, 1)))
                }
                aria-label={viewMode === 'week' ? 'Następny tydzień' : 'Następny miesiąc'}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table containerClassName="max-h-[65vh] overflow-y-auto sm:max-h-[70vh] lg:max-h-[75vh]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                {athleteId && <TableHead className="w-14" />}
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="w-12">Dzień</TableHead>
                <TableHead className="w-36">Typ</TableHead>
                <TableHead>Trening</TableHead>
                <TableHead className="w-24 text-right">Dystans</TableHead>
                <TableHead className="w-24 text-right">Czas</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Dodatkowe notatki</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day) => {
                const workout = workouts.find((w) =>
                  isSameDay(parseISO(w.scheduledDate), day),
                );
                const completed = workout ? isCompleted(day) : false;
                const dateStr = format(day, 'yyyy-MM-dd');

                return (
                  <TableRow
                    key={day.toISOString()}
                    className={workout ? '' : 'text-muted-foreground'}
                  >
                    {athleteId && (
                      <TableCell className="py-1">
                        <div className="flex items-center gap-0.5">
                          {!workout ? (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Dodaj trening"
                              className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() => setAction({ type: 'add', date: dateStr })}
                            >
                              <PlusCircle />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="Edytuj trening"
                                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => setAction({ type: 'edit', workout })}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="Usuń trening"
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => setAction({ type: 'delete', workout })}
                              >
                                <Trash2 />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">
                      {format(day, 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(day, 'EEE', { locale: pl })}
                    </TableCell>
                    <TableCell>
                      {workout ? (
                        <Badge
                          variant="secondary"
                          className={WORKOUT_TYPE_CLASSES[workout.workoutType]}
                        >
                          {WORKOUT_TYPE_LABELS[workout.workoutType]}
                        </Badge>
                      ) : (
                        <span className="text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {workout?.title ?? <span className="text-xs">Odpoczynek</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {workout?.totalDistanceMeters != null
                        ? formatDistance(workout.totalDistanceMeters)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {workout?.totalDurationMinutes != null
                        ? formatDuration(workout.totalDurationMinutes)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {workout ? (
                        <Badge
                          variant="outline"
                          className={
                            completed
                              ? 'border-green-600 text-green-700'
                              : 'border-neutral-400 text-neutral-600'
                          }
                        >
                          {completed ? 'Ukończony' : 'Zaplanowany'}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-sm py-2">
                      {workout && workout.segments.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {workout.segments.map((seg, i) => (
                            <div
                              key={seg.id}
                              className="flex items-baseline gap-1 text-xs leading-snug"
                            >
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {i + 1}.
                              </span>
                              <span>
                                <span className="font-semibold text-foreground">
                                  {SEGMENT_TYPE_LABELS[seg.segmentType]}
                                </span>
                                {segmentMetric(seg) && (
                                  <span className="text-muted-foreground">
                                    {' · '}
                                    {segmentMetric(seg)}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-xs py-2 align-top">
                      {workout &&
                        (() => {
                          const segNotes = workout.segments.filter((s) => s.notes);
                          const hasAny = workout.notes || segNotes.length > 0;
                          if (!hasAny) return null;
                          const noteButtons = (
                            editEntry: EditingNote,
                            deleteEntry: { type: 'workout'; workoutId: string } | { type: 'segment'; segmentId: string },
                          ) => athleteId ? (
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="Edytuj notatkę"
                                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => openNoteEdit(editEntry)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="Usuń notatkę"
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleDeleteNote(deleteEntry)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          ) : null;

                          return (
                            <div className="flex flex-col gap-1">
                              {workout.notes && (
                                <div className="group flex items-start gap-1">
                                  <p className="flex-1 text-xs text-foreground">
                                    {workout.notes}
                                  </p>
                                  {noteButtons(
                                    { type: 'workout', workoutId: workout.id, current: workout.notes },
                                    { type: 'workout', workoutId: workout.id },
                                  )}
                                </div>
                              )}
                              {segNotes.map((seg) => (
                                <div key={seg.id} className="group flex items-start gap-1 text-xs leading-snug">
                                  <div className="flex-1">
                                    <span className="font-medium text-foreground">
                                      {SEGMENT_TYPE_LABELS[seg.segmentType]}:
                                    </span>{' '}
                                    <span className="whitespace-pre-wrap text-muted-foreground">
                                      {seg.notes}
                                    </span>
                                  </div>
                                  {noteButtons(
                                    { type: 'segment', segmentId: seg.id, label: SEGMENT_TYPE_LABELS[seg.segmentType], current: seg.notes! },
                                    { type: 'segment', segmentId: seg.id },
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog
        open={action?.type === 'delete'}
        onOpenChange={(open) => !open && setAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń trening</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunąć trening{' '}
            <span className="font-medium text-foreground">
              {action?.type === 'delete' ? action.workout.title : ''}
            </span>
            ? Tej operacji nie można cofnąć.
          </p>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={isDeleting}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit note dialog */}
      <Dialog open={editingNote !== null} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingNote?.type === 'segment'
                ? `Notatki — ${editingNote.label}`
                : 'Notatki ogólne'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Wpisz notatki…"
            className="min-h-24"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingNote(null)}
              disabled={isSavingNote}
            >
              Anuluj
            </Button>
            <Button onClick={handleSaveNote} disabled={isSavingNote}>
              {isSavingNote ? 'Zapisywanie…' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit wizard (controlled) */}
      {athleteId && (action?.type === 'add' || action?.type === 'edit') && (
        <AddTrainingWizard
          key={
            action.type === 'edit'
              ? `edit-${action.workout.id}`
              : `add-${action.date}`
          }
          athleteId={athleteId}
          open
          onOpenChange={(open) => !open && setAction(null)}
          defaultDate={action.type === 'add' ? action.date : undefined}
          dateReadOnly
          editWorkout={action.type === 'edit' ? action.workout : undefined}
        />
      )}
    </div>
  );
}
