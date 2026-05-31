import Image from "next/image";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: photo */}
      <div className="relative w-1/2 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cnVubmVyfGVufDB8fDB8fHww"
          alt="Biegacz w parku w słoneczny poranek"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Vertical divider */}
      <div className="w-px bg-zinc-800 flex-shrink-0" />

      {/* Right: auth panel */}
      <div className="flex w-1/2 flex-col items-center justify-center gap-8 px-12 bg-black">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl font-bold tracking-tight text-white">
            RunPlanner
          </span>
          <span className="text-base text-zinc-400">
            Trenuj mądrzej. Biegnij dalej.
          </span>
        </div>

        <Show when="signed-out">
          <div className="flex w-full max-w-xs flex-col gap-3">
            <SignInButton mode="modal">
              <button className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 cursor-pointer">
                Zaloguj się
              </button>
            </SignInButton>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-700" />
              <span className="text-xs text-zinc-500">Nowy tutaj?</span>
              <div className="h-px flex-1 bg-zinc-700" />
            </div>

            <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
              <button className="w-full rounded-lg border border-zinc-600 px-6 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 cursor-pointer">
                Utwórz darmowe konto
              </button>
            </SignUpButton>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-zinc-400">
              Jesteś zalogowany.
            </span>
            <a
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
            >
              Przejdź do panelu
            </a>
          </div>
        </Show>
      </div>
    </div>
  );
}
