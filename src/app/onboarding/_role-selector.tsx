'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './_actions'

type Status = 'idle' | 'saving' | 'done'

export default function RoleSelector() {
  const router = useRouter()
  const [pending, setPending] = useState<'coach' | 'athlete' | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  async function select(role: 'coach' | 'athlete') {
    setPending(role)
    setStatus('saving')
    await completeOnboarding(role)
    setStatus('done')
    router.refresh()
    router.push('/dashboard')
  }

  if (status === 'done') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-black">
        <span className="text-2xl font-semibold text-white">Gotowe!</span>
        <span className="text-sm text-zinc-400">Twoja rola została zapisana. Przekierowujemy do panelu…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-black px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-3xl font-bold tracking-tight text-white">Jak będziesz używać RunPlannera?</span>
        <span className="text-sm text-zinc-400">Wybierz swoją rolę — nie będziesz mógł jej zmienić.</span>
      </div>

      <div className="grid w-full max-w-xl grid-cols-2 gap-4">
        <RoleCard
          role="athlete"
          title="Zawodnik"
          description="Realizuj plany treningowe przypisane przez trenera i synchronizuj treningi ze Stravą."
          pending={pending}
          onSelect={select}
        />
        <RoleCard
          role="coach"
          title="Trener"
          description="Twórz ustrukturyzowane plany treningowe i zarządzaj postępami zawodników."
          pending={pending}
          onSelect={select}
        />
      </div>
    </div>
  )
}

function RoleCard({
  role,
  title,
  description,
  pending,
  onSelect,
}: {
  role: 'coach' | 'athlete'
  title: string
  description: string
  pending: 'coach' | 'athlete' | null
  onSelect: (role: 'coach' | 'athlete') => void
}) {
  const isLoading = pending === role
  const isDisabled = pending !== null

  return (
    <button
      onClick={() => onSelect(role)}
      disabled={isDisabled}
      className="flex flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-left transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-lg font-semibold text-white">
        {isLoading ? 'Zapisywanie…' : title}
      </span>
      <span className="text-sm text-zinc-400">{description}</span>
    </button>
  )
}
