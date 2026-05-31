'use client';

import { useState } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WorkoutRow } from '@/data';

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

// No status column exists on `workouts`; derive a display status from the date.
function isCompleted(scheduledDate: Date): boolean {
  return isBefore(scheduledDate, startOfDay(new Date()));
}

type ViewMode = 'month' | 'week';

const WEEK_OPTS = { weekStartsOn: 1 } as const;

export function MonthlyTrainingTable({ workouts }: { workouts: WorkoutRow[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');

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

  function toggleView() {
    if (viewMode === 'month') {
      setViewMode('week');
      setMonth(startOfWeek(new Date(), WEEK_OPTS));
    } else {
      setViewMode('month');
      setMonth(startOfMonth(new Date()));
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
              <TableHead className="w-28">Data</TableHead>
              <TableHead className="w-12">Dzień</TableHead>
              <TableHead className="w-36">Typ</TableHead>
              <TableHead>Trening</TableHead>
              <TableHead className="w-24 text-right">Dystans</TableHead>
              <TableHead className="w-24 text-right">Czas</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead>Notatki</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => {
              const workout = workouts.find((w) =>
                isSameDay(parseISO(w.scheduledDate), day),
              );
              const completed = workout ? isCompleted(day) : false;
              return (
                <TableRow
                  key={day.toISOString()}
                  className={workout ? '' : 'text-muted-foreground'}
                >
                  <TableCell className="font-mono text-sm">
                    {format(day, 'dd.MM.yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">{format(day, 'EEE')}</TableCell>
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
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {workout?.notes ?? ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </div>
  );
}
