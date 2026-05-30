'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './_actions'

type Status = 'idle' | 'saving' | 'done'

export default function OnboardingPage() {
  const router = useRouter()
  const [pending, setPending] = useState<'coach' | 'athlete' | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  async function select(role: 'coach' | 'athlete') {
    setPending(role)
    setStatus('saving')
    await completeOnboarding(role)
    setStatus('done')
    // Refresh the session so the middleware reads the updated publicMetadata,
    // then navigate to the landing page.
    router.refresh()
    router.push('/')
  }

  if (status === 'done') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-black">
        <span className="text-2xl font-semibold text-white">All set!</span>
        <span className="text-sm text-zinc-400">Your role has been saved. Taking you home…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-black px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-3xl font-bold tracking-tight text-white">How will you use RunPlanner?</span>
        <span className="text-sm text-zinc-400">Choose your role — you can&apos;t change it later.</span>
      </div>

      <div className="grid w-full max-w-xl grid-cols-2 gap-4">
        <RoleCard
          role="athlete"
          title="Athlete"
          description="Follow training plans assigned by your coach and sync workouts from Strava."
          pending={pending}
          onSelect={select}
        />
        <RoleCard
          role="coach"
          title="Coach"
          description="Create structured training plans and manage your athletes' progress."
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
        {isLoading ? 'Saving…' : title}
      </span>
      <span className="text-sm text-zinc-400">{description}</span>
    </button>
  )
}
