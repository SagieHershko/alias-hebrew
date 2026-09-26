// Security-rules tests against the Firestore emulator: `npm run emulators` in one terminal, then `npm run test:rules`.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, deleteField } from 'firebase/firestore';
import fs from 'node:fs';

const env = await initializeTestEnvironment({
  projectId: 'demo-alias',
  firestore: { rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
await env.clearFirestore();
const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const player = (name, teamIndex = 0) => ({ name, photo: null, teamIndex, joinedAt: Date.now() });
const settings = { targetScore: 30, turnSeconds: 60, skipPenalty: false };
const room = (over = {}) => ({
  code: 'ABCDE', hostUid: 'host', status: 'lobby', createdAt: Date.now(), updatedAt: serverTimestamp(),
  players: { host: player('Host') }, teamNames: ['א', 'ב'], settings, game: null, rev: 0, ...over,
});
const ref = (d) => doc(d, 'rooms', 'ABCDE');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
async function t(name, p) { try { await p; pass++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name, '\n    ', e.message.split('\n')[0]); process.exitCode = 1; } }

console.log('Creating rooms');
await t('signed-out user cannot create', assertFails(setDoc(ref(db(null)), room())));
await t('cannot create a room for someone else', assertFails(setDoc(ref(db('eve')), room())));
await t('cannot create with extra players', assertFails(setDoc(ref(db('host')), room({ players: { host: player('Host'), bob: player('Bob') } }))));
await t('cannot create a room with a game already in it', assertFails(setDoc(ref(db('host')), room({ game: '{}' }))));
await t('code must match the document id', assertFails(setDoc(ref(db('host')), room({ code: 'ZZZZZ' }))));
await t('host creates a valid room', assertSucceeds(setDoc(ref(db('host')), room())));

console.log('Reading');
await t('signed-out user cannot read', assertFails(getDoc(ref(db(null)))));
await t('signed-in user with the code can open it', assertSucceeds(getDoc(ref(db('bob')))));
await t('nobody can list / scan rooms', assertFails(getDocs(collection(db('bob'), 'rooms'))));

console.log('Joining');
await t('bob joins with his own entry', assertSucceeds(updateDoc(ref(db('bob')), { 'players.bob': player('Bob', null) })));
await t('bob cannot add someone else', assertFails(updateDoc(ref(db('bob')), { 'players.mallory': player('M', null) })));
await t('bob cannot edit the host\'s entry', assertFails(updateDoc(ref(db('bob')), { 'players.host.teamIndex': 1 })));
await t('name too long is rejected', assertFails(updateDoc(ref(db('bob')), { 'players.bob.name': 'x'.repeat(200) })));
await t('invalid team index is rejected', assertFails(updateDoc(ref(db('bob')), { 'players.bob.teamIndex': 9 })));
await t('extra fields in a player are rejected', assertFails(updateDoc(ref(db('bob')), { 'players.bob.admin': true })));
await t('bob picks team 1', assertSucceeds(updateDoc(ref(db('bob')), { 'players.bob.teamIndex': 1 })));

console.log('Settings (host only)');
await wait(150);
await t('non-host cannot change settings', assertFails(updateDoc(ref(db('bob')), { settings: { ...settings, targetScore: 50 }, updatedAt: serverTimestamp() })));
await t('host changes settings', assertSucceeds(updateDoc(ref(db('host')), { settings: { ...settings, targetScore: 50 }, updatedAt: serverTimestamp() })));
await wait(150);
await t('invalid settings are rejected', assertFails(updateDoc(ref(db('host')), { settings: { ...settings, turnSeconds: 5000 }, updatedAt: serverTimestamp() })));
await t('host cannot hand the room to someone else', assertFails(updateDoc(ref(db('host')), { hostUid: 'bob', updatedAt: serverTimestamp() })));
await t('7 teams are rejected', assertFails(updateDoc(ref(db('host')), { teamNames: ['1','2','3','4','5','6','7'], updatedAt: serverTimestamp() })));
await t('write without the server time stamp is rejected', assertFails(updateDoc(ref(db('host')), { teamNames: ['א', 'ב', 'ג'] })));
await wait(150);
await t('host starts the game', assertSucceeds(updateDoc(ref(db('host')), { status: 'playing', game: '{"teams":[]}', rev: 1, updatedAt: serverTimestamp() })));

console.log('Playing');
await wait(150);
await t('stranger cannot change the game', assertFails(updateDoc(ref(db('eve')), { game: '{"x":1}', rev: 2, updatedAt: serverTimestamp() })));
await t('member must bump rev by exactly 1', assertFails(updateDoc(ref(db('bob')), { game: '{"x":1}', rev: 5, updatedAt: serverTimestamp() })));
await t('member cannot change the status', assertFails(updateDoc(ref(db('bob')), { status: 'lobby', game: null, rev: 2, updatedAt: serverTimestamp() })));
await t('member updates the game', assertSucceeds(updateDoc(ref(db('bob')), { game: '{"x":1}', rev: 2, updatedAt: serverTimestamp() })));
await t('RATE LIMIT: a second write within 100 ms is refused', assertFails(updateDoc(ref(db('bob')), { game: '{"x":2}', rev: 3, updatedAt: serverTimestamp() })));
await wait(150);
await t('…and accepted after 100 ms', assertSucceeds(updateDoc(ref(db('bob')), { game: '{"x":2}', rev: 3, updatedAt: serverTimestamp() })));
await wait(150);
await t('huge game (>300 KB) is rejected', assertFails(updateDoc(ref(db('bob')), { game: 'x'.repeat(310000), rev: 4, updatedAt: serverTimestamp() })));

console.log('Limits');
await env.withSecurityRulesDisabled(async (ctx) => {
  const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`p${i}`, player(`P${i}`, null)]));
  await setDoc(doc(ctx.firestore(), 'rooms', 'FULLL'), { ...room({ code: 'FULLL', hostUid: 'p0', players: many }), updatedAt: new Date() });
});
await t('21st player cannot join (max 20)', assertFails(updateDoc(doc(db('late'), 'rooms', 'FULLL'), { 'players.late': player('Late', null) })));

console.log('Clock sync & delete');
await t('player writes own clock ping', assertSucceeds(setDoc(doc(db('bob'), 'rooms/ABCDE/clock/bob'), { t: serverTimestamp() })));
await t('cannot write another player\'s ping', assertFails(setDoc(doc(db('bob'), 'rooms/ABCDE/clock/host'), { t: serverTimestamp() })));
await t('ping must be the server time', assertFails(setDoc(doc(db('bob'), 'rooms/ABCDE/clock/bob'), { t: 12345 })));
await t('non-host cannot delete the room', assertFails(deleteDoc(ref(db('bob')))));
await t('player can leave (remove own entry)', assertSucceeds(updateDoc(ref(db('bob')), { 'players.bob': deleteField() })));

console.log(`\n${pass} rules checks passed${process.exitCode ? ' — SOME FAILED' : ''}`);
await env.cleanup();
