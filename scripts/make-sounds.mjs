// Synthesises the game's sound effects into assets/sounds/*.wav (16-bit mono PCM).
// Usage: node scripts/make-sounds.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
const RATE = 22050;
const TAU = Math.PI * 2;
let seed = 12345;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function render(seconds, fn) {
  const n = Math.round(seconds * RATE);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = fn(i / RATE, i);
  return data;
}

function writeWav(name, samples, gain = 0.9) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peak > 0 ? gain / peak : 0;
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * scale)) * 32767), 44 + i * 2));
  fs.writeFileSync(path.join(out, name), buf);
  console.log('wrote', name, (samples.length / RATE).toFixed(2) + 's');
}

const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
const bell = (t, f) => Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2 * t) + 0.25 * Math.sin(TAU * f * 3 * t);

// נכון: a bright two-note chime going up.
writeWav(
  'correct.wav',
  render(0.55, (t) => {
    const a = t < 0.5 ? bell(t, 880) * env(t, 0.005, 0.09) : 0;
    const t2 = t - 0.09;
    const b = t2 > 0 ? bell(t2, 1318.5) * env(t2, 0.005, 0.16) : 0;
    return 0.6 * a + 0.8 * b;
  }),
  0.8,
);

// דלג: a soft falling "whoop".
{
  let phase = 0;
  writeWav(
    'skip.wav',
    render(0.3, (t) => {
      const f = 420 * Math.pow(150 / 420, t / 0.3);
      phase += (TAU * f) / RATE;
      return (Math.sin(phase) + 0.3 * Math.sin(phase * 2)) * env(t, 0.01, 0.1);
    }),
    0.7,
  );
}

// Pawn hopping one square: a short wooden "tok".
writeWav(
  'hop.wav',
  render(0.12, (t) => {
    const body = Math.sin(TAU * 560 * t) + 0.6 * Math.sin(TAU * 1210 * t) + 0.3 * Math.sin(TAU * 2240 * t);
    return body * env(t, 0.001, 0.022) + noise() * 0.3 * env(t, 0.0005, 0.004);
  }),
  0.85,
);

// Clock ticking in the last seconds: a crisp tick and a lower tock.
for (const [name, f] of [
  ['tick.wav', 2600],
  ['tock.wav', 1900],
]) {
  writeWav(
    name,
    render(0.08, (t) => (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.5 * t)) * env(t, 0.0005, 0.012) + noise() * 0.25 * env(t, 0.0003, 0.003)),
    0.75,
  );
}

// Time is up: a ringing bell with inharmonic partials.
writeWav(
  'timeup.wav',
  render(1.6, (t) => {
    const strike = (tt) =>
      tt < 0
        ? 0
        : (Math.sin(TAU * 740 * tt) + 0.6 * Math.sin(TAU * 740 * 2.76 * tt) + 0.3 * Math.sin(TAU * 740 * 5.4 * tt)) *
          env(tt, 0.002, 0.45);
    return strike(t) + 0.8 * strike(t - 0.22);
  }),
  0.85,
);

// Sand timer flipping over: a short airy whoosh.
{
  let lp = 0;
  let lp2 = 0;
  writeWav(
    'flip.wav',
    render(0.7, (t) => {
      const cutoff = 0.05 + 0.25 * Math.sin((Math.PI * t) / 0.7);
      lp += cutoff * (noise() - lp);
      lp2 += 0.5 * cutoff * (lp - lp2);
      return (lp - lp2) * Math.sin((Math.PI * t) / 0.7);
    }),
    0.6,
  );
}
