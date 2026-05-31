'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { MonthlyTrainingTable } from './_monthly-training-table';
import type { Athlete, WorkoutRow } from '@/data';

export interface CoachAthlete extends Athlete {
  workouts: WorkoutRow[];
}

export function CoachDashboard({ athletes }: { athletes: CoachAthlete[] }) {
  if (athletes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nie masz jeszcze żadnych zawodników. Gdy zawodnicy zostaną przypisani do Ciebie, pojawią się tutaj.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs
      orientation="vertical"
      defaultValue={athletes[0].id}
      className="flex flex-row items-start gap-6"
    >
      <TabsList className="h-auto w-56 shrink-0 flex-col items-stretch gap-1 bg-muted/50 p-2">
        {athletes.map((athlete) => (
          <TabsTrigger
            key={athlete.id}
            value={athlete.id}
            className="h-auto flex-none flex-col items-start gap-0.5 px-3 py-2 text-left"
          >
            <span className="font-medium">{athlete.name ?? 'Nieznany zawodnik'}</span>
            <span className="text-xs text-muted-foreground">{athlete.email}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="min-w-0 flex-1">
        {athletes.map((athlete) => (
          <TabsContent key={athlete.id} value={athlete.id}>
            <MonthlyTrainingTable workouts={athlete.workouts} />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
