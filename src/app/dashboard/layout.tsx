import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/data'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/')

  // The DB is the source of truth for whether a role was ever chosen.
  const user = await getCurrentUser()
  if (!user) redirect('/onboarding')

  return <>{children}</>
}
