'use client';

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
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

type WorkoutType =
  | 'easy_run'
  | 'tempo_run'
  | 'interval_training'
  | 'long_run'
  | 'race'
  | 'rest'
  | 'cross_training'
  | 'strength'
  | 'fartlek'
  | 'hill_workout';

type WorkoutStatus = 'planned' | 'completed';

interface Workout {
  scheduledDate: Date;
  title: string;
  workoutType: WorkoutType;
  totalDistanceMeters: number | null;
  totalDurationMinutes: number | null;
  status: WorkoutStatus;
  notes: string | null;
}

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  easy_run: 'Easy Run',
  tempo_run: 'Tempo',
  interval_training: 'Intervals',
  long_run: 'Long Run',
  race: 'Race',
  rest: 'Rest',
  cross_training: 'Cross Training',
  strength: 'Strength',
  fartlek: 'Fartlek',
  hill_workout: 'Hills',
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

// Mock workouts for May 2026
const MOCK_WORKOUTS: Workout[] = [
  {
    scheduledDate: new Date(2026, 4, 1),
    title: 'Easy morning jog',
    workoutType: 'easy_run',
    totalDistanceMeters: 5000,
    totalDurationMinutes: 30,
    status: 'completed',
    notes: 'Recovery pace, keep HR under 140',
  },
  {
    scheduledDate: new Date(2026, 4, 3),
    title: 'Strength & core',
    workoutType: 'strength',
    totalDistanceMeters: null,
    totalDurationMinutes: 45,
    status: 'completed',
    notes: null,
  },
  {
    scheduledDate: new Date(2026, 4, 5),
    title: 'Tempo threshold run',
    workoutType: 'tempo_run',
    totalDistanceMeters: 8000,
    totalDurationMinutes: 40,
    status: 'completed',
    notes: '2km warm-up, 5km at threshold, 1km cool-down',
  },
  {
    scheduledDate: new Date(2026, 4, 7),
    title: 'Sunday long run',
    workoutType: 'long_run',
    totalDistanceMeters: 18000,
    totalDurationMinutes: 105,
    status: 'completed',
    notes: 'Conversational pace throughout',
  },
  {
    scheduledDate: new Date(2026, 4, 10),
    title: '400m repeats',
    workoutType: 'interval_training',
    totalDistanceMeters: 10000,
    totalDurationMinutes: 55,
    status: 'completed',
    notes: '8×400m @ 5K pace, 90s rest',
  },
  {
    scheduledDate: new Date(2026, 4, 13),
    title: 'Hill repeats',
    workoutType: 'hill_workout',
    totalDistanceMeters: 9000,
    totalDurationMinutes: 50,
    status: 'completed',
    notes: '6×200m hill sprints',
  },
  {
    scheduledDate: new Date(2026, 4, 15),
    title: 'Cycling recovery',
    workoutType: 'cross_training',
    totalDistanceMeters: null,
    totalDurationMinutes: 60,
    status: 'completed',
    notes: 'Easy spin, active recovery',
  },
  {
    scheduledDate: new Date(2026, 4, 17),
    title: 'Fartlek session',
    workoutType: 'fartlek',
    totalDistanceMeters: 11000,
    totalDurationMinutes: 60,
    status: 'completed',
    notes: 'Unstructured surges throughout',
  },
  {
    scheduledDate: new Date(2026, 4, 20),
    title: 'Easy aerobic',
    workoutType: 'easy_run',
    totalDistanceMeters: 7000,
    totalDurationMinutes: 42,
    status: 'completed',
    notes: null,
  },
  {
    scheduledDate: new Date(2026, 4, 22),
    title: 'Tempo intervals',
    workoutType: 'tempo_run',
    totalDistanceMeters: 9000,
    totalDurationMinutes: 48,
    status: 'completed',
    notes: '3×2km at LT pace',
  },
  {
    scheduledDate: new Date(2026, 4, 24),
    title: '20-mile long run',
    workoutType: 'long_run',
    totalDistanceMeters: 32000,
    totalDurationMinutes: 195,
    status: 'completed',
    notes: 'Peak week long run — fuelling practice',
  },
  {
    scheduledDate: new Date(2026, 4, 27),
    title: 'Easy shakeout',
    workoutType: 'easy_run',
    totalDistanceMeters: 4000,
    totalDurationMinutes: 25,
    status: 'completed',
    notes: null,
  },
  {
    scheduledDate: new Date(2026, 4, 30),
    title: '5K intervals',
    workoutType: 'interval_training',
    totalDistanceMeters: 12000,
    totalDurationMinutes: 65,
    status: 'planned',
    notes: '4×1200m @ 5K pace',
  },
  {
    scheduledDate: new Date(2026, 4, 31),
    title: 'Sunday long run',
    workoutType: 'long_run',
    totalDistanceMeters: 22000,
    totalDurationMinutes: 130,
    status: 'planned',
    notes: null,
  },
];

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

export default function DashboardPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{format(month, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-12">Day</TableHead>
                <TableHead className="w-36">Type</TableHead>
                <TableHead>Workout</TableHead>
                <TableHead className="w-24 text-right">Distance</TableHead>
                <TableHead className="w-24 text-right">Duration</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day) => {
                const workout = MOCK_WORKOUTS.find((w) => isSameDay(w.scheduledDate, day));
                return (
                  <TableRow key={day.toISOString()} className={workout ? '' : 'text-muted-foreground'}>
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
                      {workout?.title ?? <span className="text-xs">Rest</span>}
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
                            workout.status === 'completed'
                              ? 'border-green-600 text-green-700'
                              : 'border-neutral-400 text-neutral-600'
                          }
                        >
                          {workout.status === 'completed' ? 'Completed' : 'Planned'}
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
    </main>
  );
}
