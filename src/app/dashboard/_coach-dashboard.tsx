'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MonthlyTrainingTable } from './_monthly-training-table';
import { updateAthleteCustomNameAction } from './actions';
import type { Athlete, WorkoutRow } from '@/data';

export interface CoachAthlete extends Athlete {
  workouts: WorkoutRow[];
}

export function CoachDashboard({ athletes: initialAthletes }: { athletes: CoachAthlete[] }) {
  const [athletes, setAthletes] = useState(initialAthletes);
  const [editingAthlete, setEditingAthlete] = useState<CoachAthlete | null>(null);
  const [draftName, setDraftName] = useState('');
  const [saved, setSaved] = useState(false);

  if (athletes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nie masz jeszcze żadnych zawodników. Gdy zawodnicy zostaną przypisani do Ciebie, pojawią się tutaj.
        </CardContent>
      </Card>
    );
  }

  function openEdit(athlete: CoachAthlete) {
    setSaved(false);
    setDraftName(athlete.customName ?? athlete.name ?? '');
    setEditingAthlete(athlete);
  }

  function closeDialog() {
    setEditingAthlete(null);
    setSaved(false);
  }

  async function handleSave() {
    if (!editingAthlete || !draftName.trim()) return;
    const result = await updateAthleteCustomNameAction(editingAthlete.id, draftName.trim());
    if ('success' in result) {
      setAthletes((prev) =>
        prev.map((a) => (a.id === editingAthlete.id ? { ...a, customName: draftName.trim() } : a)),
      );
      setSaved(true);
      setTimeout(closeDialog, 1500);
    }
  }

  const currentDisplayName =
    editingAthlete?.customName ?? editingAthlete?.name ?? 'Nieznany zawodnik';

  return (
    <>
      <Tabs
        orientation="vertical"
        defaultValue={athletes[0].id}
        className="flex flex-row items-start gap-6"
      >
        <TabsList className="h-auto w-56 shrink-0 flex-col items-stretch gap-1 bg-muted/50 p-2">
          {athletes.map((athlete) => (
            <ContextMenu key={athlete.id}>
              <ContextMenuTrigger className="w-full">
                <TabsTrigger
                  value={athlete.id}
                  className="h-auto w-full flex-none flex-col items-start gap-0.5 px-3 py-2 text-left data-active:bg-blue-600 data-active:text-white dark:data-active:bg-blue-600 dark:data-active:text-white"
                >
                  <span className="font-medium">
                    {athlete.customName ?? athlete.name ?? 'Nieznany zawodnik'}
                  </span>
                </TabsTrigger>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => openEdit(athlete)}>
                  Edytuj nazwę
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
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

      <Dialog open={editingAthlete !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj nazwę zawodnika</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Bieżąca nazwa:{' '}
              <span className="font-medium text-foreground">{currentDisplayName}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Nowa nazwa</p>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Wpisz nową nazwę…"
                disabled={saved}
              />
            </div>
            {saved && (
              <p className="text-sm font-semibold text-green-600">Zapisano zmiany</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!draftName.trim() || saved}>
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
