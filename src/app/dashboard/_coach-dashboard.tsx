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
import { MonthlyTrainingTable, type ViewMode } from './_monthly-training-table';
import { updateAthleteCustomNameAction } from './actions';
import { AddTrainingWizard } from './_add-training-wizard';
import type { Athlete, WorkoutRow } from '@/data';

export interface CoachAthlete extends Athlete {
  workouts: WorkoutRow[];
}

export function CoachDashboard({ athletes: initialAthletes }: { athletes: CoachAthlete[] }) {
  // nameOverrides holds optimistic name edits until the next server refresh
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [selectedAthleteId, setSelectedAthleteId] = useState(initialAthletes[0]?.id ?? '');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [editingAthlete, setEditingAthlete] = useState<CoachAthlete | null>(null);
  const [draftName, setDraftName] = useState('');
  const [saved, setSaved] = useState(false);

  // Derive effective athletes list — no state needed, updates automatically on router.refresh()
  const athletes = initialAthletes.map((a) => ({
    ...a,
    customName: nameOverrides[a.id] ?? a.customName,
  }));

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
      setNameOverrides((prev) => ({ ...prev, [editingAthlete.id]: draftName.trim() }));
      setSaved(true);
      setTimeout(closeDialog, 1500);
    }
  }

  const currentDisplayName =
    editingAthlete?.customName ?? editingAthlete?.name ?? 'Nieznany zawodnik';

  return (
    <>
      <Tabs
        value={selectedAthleteId}
        onValueChange={setSelectedAthleteId}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setViewMode((m) => (m === 'month' ? 'week' : 'month'))}
          >
            {viewMode === 'month' ? 'Widok tygodniowy' : 'Widok miesięczny'}
          </Button>
          <AddTrainingWizard athleteId={selectedAthleteId} />
        </div>

        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-2">
          {athletes.map((athlete) => (
            <ContextMenu key={athlete.id}>
              <ContextMenuTrigger>
                <TabsTrigger
                  value={athlete.id}
                  className="h-auto flex-none px-3 py-2 data-active:bg-blue-600 data-active:text-white dark:data-active:bg-blue-600 dark:data-active:text-white"
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

        {athletes.map((athlete) => (
          <TabsContent key={athlete.id} value={athlete.id}>
            <MonthlyTrainingTable
              workouts={athlete.workouts}
              athleteId={athlete.id}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </TabsContent>
        ))}
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
