import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { useEffect, useState } from 'react';

import type { Player } from '../game/types';
import { EMULATOR_HOST, firebase } from './firebase';

/** The signed-in Google user (or null), and whether the first check is still running. */
export function useAuthUser() {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  useEffect(() => onAuthStateChanged(firebase().auth, (user) => setState({ user, loading: false })), []);
  return state;
}

export async function signInWithGoogle() {
  const { auth } = firebase();
  if (EMULATOR_HOST) {
    // Local development / tests only: the Auth emulator accepts a made-up Google account.
    const name = globalThis.prompt?.('שם לבדיקה (אמולטור)') || 'שחקן';
    const email = `${name.toLowerCase().replace(/\W+/g, '') || 'player'}@test.dev`;
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name })),
    );
    return;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code;
    // Some mobile browsers block pop-ups: fall back to a full-page redirect.
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    throw e;
  }
}

export function signOut() {
  return fbSignOut(firebase().auth);
}

export function playerFromUser(user: User): Player {
  return {
    id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'שחקן',
    photo: user.photoURL,
  };
}
