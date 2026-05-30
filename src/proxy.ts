import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublic = createRouteMatcher(['/', '/api/webhooks(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Onboarding state is enforced in server layouts/pages that read the
  // database directly. The JWT session claim can be stale right after a
  // metadata update, which would cause a redirect loop against the DB.
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/(.*)',
    '/(api|trpc)(.*)',
  ],
}
