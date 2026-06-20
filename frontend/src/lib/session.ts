import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const SESSION_KEY = 'spur_session_id';

function createSessionStore() {
  const initial = browser ? localStorage.getItem(SESSION_KEY) ?? undefined : undefined;
  const { subscribe, set } = writable<string | undefined>(initial);

  return {
    subscribe,
    save(id: string) {
      if (browser) localStorage.setItem(SESSION_KEY, id);
      set(id);
    },
    clear() {
      if (browser) localStorage.removeItem(SESSION_KEY);
      set(undefined);
    }
  };
}

export const sessionStore = createSessionStore();
