'use client';

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { SettingsMenu } from './settings-menu';

export function HeaderButtons() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-4 py-1.5 rounded-md transition-colors cursor-pointer shadow-sm">
            Zaloguj się
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-1.5 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm">
            Zarejestruj się
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <SettingsMenu />
        <UserButton />
      </Show>
    </>
  );
}
