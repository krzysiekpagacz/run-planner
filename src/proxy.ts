import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublic = createRouteMatcher(['/', '/api/webhooks(.*)'])
const isOnboarding = createRouteMatcher(['/onboarding'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()

  if (!userId || isPublic(req) || isOnboarding(req)) return

  const onboarded = (sessionClaims?.publicMetadata as { onboardingComplete?: boolean } | undefined)
    ?.onboardingComplete
  if (!onboarded) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/(.*)',
    '/(api|trpc)(.*)',
  ],
}
