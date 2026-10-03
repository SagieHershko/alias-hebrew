import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * A seated mannequin in the room's low-poly style, in its team's colour: it drops onto the
 * sofa when it first appears, then idles "thinking" — breathing, chin on one hand, the
 * other hand on the knee, head tilting and a tapping foot. Built from primitives, in room
 * units (u), facing +z with its hips at the origin (on the seat).
 */

/** How long the sit-down takes, in seconds. */
const SIT_DOWN = 0.9;

const easeOutBack = (k: number) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;

/** Stable 0–1 number per player, so each one moves out of step with the others. */
function phaseOf(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** A limb hanging from its pivot along -y. */
function Limb({ radius, length, material }: { radius: number; length: number; material: THREE.Material }) {
  return (
    <mesh position={[0, -length / 2, 0]} material={material} castShadow>
      <capsuleGeometry args={[radius, Math.max(0.001, length - 2 * radius), 4, 10]} />
    </mesh>
  );
}

export function SittingPlayer({ id, color, u }: { id: string; color: string; u: number }) {
  const phase = useMemo(() => phaseOf(id), [id]);
  // A thinker leans on the left or the right hand.
  const side = phase < 0.5 ? 1 : -1;

  const body = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.55 }), [color]);
  const head = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25), roughness: 0.5 }),
    [color],
  );

  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const thinkUpper = useRef<THREE.Group>(null);
  const thinkFore = useRef<THREE.Group>(null);
  const tapShin = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (born.current === null) born.current = t;
    const k = Math.min(1, (t - born.current) / SIT_DOWN);
    const p = t + phase * 20;

    if (root.current) {
      // Sit down: drop from standing height onto the seat with a small bounce.
      const s = easeOutBack(k);
      root.current.position.y = (1 - s) * 7 * u;
      root.current.scale.setScalar(0.6 + 0.4 * Math.min(1, k * 1.4));
    }
    if (torso.current) {
      // Lean forward to think, with slow breathing.
      torso.current.rotation.x = 0.1 + 0.32 * k + Math.sin(p * 1.6) * 0.015;
      torso.current.scale.y = 1 + Math.sin(p * 1.6) * 0.012;
    }
    if (neck.current) {
      // Ponder: tilt and look around now and then.
      neck.current.rotation.z = side * (0.12 + Math.sin(p * 0.45) * 0.08);
      neck.current.rotation.y = Math.sin(p * 0.3) * 0.35 * Math.max(0, Math.sin(p * 0.11));
      neck.current.rotation.x = -0.15 + Math.sin(p * 0.7) * 0.05;
    }
    if (thinkUpper.current && thinkFore.current) {
      // Elbow on the knee, fist under the chin; the fingers tap now and then.
      thinkUpper.current.rotation.x = -1.05 * k;
      thinkFore.current.rotation.x = -2.15 * k + Math.max(0, Math.sin(p * 2.2)) * 0.12;
    }
    if (tapShin.current) {
      tapShin.current.rotation.x = Math.PI / 2 - 0.12 + Math.max(0, Math.sin(p * 5)) * 0.1 * k;
    }
  });

  // Stylised, a little smaller than life so the board stays the star; shins still reach the floor.
  const hipW = 1.3 * u;
  const thigh = 6.6 * u;
  const shin = 8.4 * u;
  const upper = 3.6 * u;
  const fore = 3.4 * u;
  const shoulderY = 6.2 * u;
  const shoulderX = 2.4 * u;

  return (
    <group ref={root}>
      {/* Pelvis */}
      <mesh position={[0, 0.5 * u, 0]} scale={[1.9, 1.1, 1.5]} material={body} castShadow>
        <sphereGeometry args={[1.2 * u, 14, 10]} />
      </mesh>

      {/* Legs: thighs forward on the seat, shins down to the floor. */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * hipW, 0.4 * u, 0]} rotation={[-Math.PI / 2, 0, sx * 0.06]}>
          <Limb radius={0.95 * u} length={thigh} material={body} />
          <group
            ref={sx === -side ? tapShin : undefined}
            position={[0, -thigh + 0.5 * u, 0]}
            rotation={[Math.PI / 2 - 0.12, 0, 0]}
          >
            <Limb radius={0.75 * u} length={shin} material={body} />
            <mesh position={[0, -shin + 0.4 * u, 0.8 * u]} scale={[1, 0.6, 2]} material={body} castShadow>
              <sphereGeometry args={[0.7 * u, 10, 8]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Upper body */}
      <group ref={torso} position={[0, 0.9 * u, 0]}>
        <mesh position={[0, 3 * u, 0]} scale={[1.35, 1, 0.85]} material={body} castShadow>
          <capsuleGeometry args={[1.75 * u, 2.7 * u, 4, 14]} />
        </mesh>

        <group ref={neck} position={[0, shoulderY + 0.4 * u, 0]}>
          <mesh position={[0, 0.45 * u, 0]} material={head}>
            <cylinderGeometry args={[0.5 * u, 0.6 * u, 1 * u, 10]} />
          </mesh>
          <mesh position={[0, 2.1 * u, 0.15 * u]} scale={[1, 1.25, 1.05]} material={head} castShadow>
            <sphereGeometry args={[1.4 * u, 18, 14]} />
          </mesh>
        </group>

        {/* Thinking arm: elbow down on the knee, fist up to the chin. */}
        <group ref={thinkUpper} position={[side * shoulderX, shoulderY, 0]} rotation={[0, 0, side * 0.12]}>
          <Limb radius={0.65 * u} length={upper} material={body} />
          <group ref={thinkFore} position={[0, -upper, 0]}>
            <Limb radius={0.55 * u} length={fore} material={body} />
            <mesh position={[0, -fore - 0.2 * u, 0]} material={head}>
              <sphereGeometry args={[0.7 * u, 10, 8]} />
            </mesh>
          </group>
        </group>

        {/* Resting arm: hand on the other knee. */}
        <group position={[-side * shoulderX, shoulderY, 0]} rotation={[-0.75, 0, -side * 0.1]}>
          <Limb radius={0.65 * u} length={upper} material={body} />
          <group position={[0, -upper, 0]} rotation={[-0.55, 0, 0]}>
            <Limb radius={0.55 * u} length={fore} material={body} />
            <mesh position={[0, -fore - 0.2 * u, 0]} material={head}>
              <sphereGeometry args={[0.7 * u, 10, 8]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

export interface Sitter {
  id: string;
  color: string;
}

/**
 * Seats players along a sofa (local frame of the Sofa component: front faces +z, seat top at
 * `seatY`). Spreads them evenly; a crowded sofa squeezes them closer and makes them a bit smaller.
 */
export function SofaSitters({ sitters, width, u }: { sitters: Sitter[]; width: number; u: number }) {
  const group = useRef<THREE.Group>(null);
  // Like the walls: when the camera is behind this sofa, its players would block the board — hide them.
  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const pos = g.getWorldPosition(new THREE.Vector3());
    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
    g.visible = camera.position.clone().sub(pos).dot(facing) > -4 * u;
  });
  if (sitters.length === 0) return null;
  const seatY = 8.5 * u; // legs + seat cushion (see Sofa)
  const usable = width - 8 * u; // inside the arms
  const spacing = Math.min(6.5 * u, usable / sitters.length);
  const scale = Math.min(1, spacing / (5.5 * u));
  const start = -((sitters.length - 1) * spacing) / 2;
  return (
    <group ref={group}>
      {sitters.map((s, i) => (
        <group key={s.id} position={[start + i * spacing, seatY, 9 * u]} scale={[scale, 1, 1]}>
          <SittingPlayer id={s.id} color={s.color} u={u} />
        </group>
      ))}
    </group>
  );
}
