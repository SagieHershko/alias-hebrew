import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * A seated mannequin in the room's low-poly style, in its team's colour. It drops onto the
 * sofa when it first appears, then sits relaxed with its hands on its knees — breathing,
 * looking around, a tapping foot and drumming fingers. The player explaining this turn
 * holds up a red Alias card instead. Built from primitives, in room units (u), facing +z
 * with its hips at the origin (on the seat).
 */

/** How long the sit-down takes, in seconds. */
const SIT_DOWN = 0.9;
const CARD_RED = '#E30613';

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

/** Arm angles (around x) for a hand resting on the knee, and for a hand holding up a card. */
const REST = { upper: -0.75, fore: -0.55 };
const HOLD = { upper: -0.5, fore: -1.9 };

export function SittingPlayer({
  id,
  color,
  u,
  holdingCard,
}: {
  id: string;
  color: string;
  u: number;
  holdingCard: boolean;
}) {
  const phase = useMemo(() => phaseOf(id), [id]);
  // Right- or left-handed card holder.
  const side = phase < 0.5 ? 1 : -1;

  const body = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.55 }), [color]);
  const skin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25),
        roughness: 0.5,
      }),
    [color],
  );

  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const cardUpper = useRef<THREE.Group>(null);
  const cardFore = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const restFore = useRef<THREE.Group>(null);
  const tapShin = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  // 0 = hand on the knee, 1 = card held up; eased so the arm lifts and lowers smoothly.
  const hold = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (born.current === null) born.current = t;
    const k = Math.min(1, (t - born.current) / SIT_DOWN);
    const p = t + phase * 20;
    hold.current += ((holdingCard ? 1 : 0) - hold.current) * Math.min(1, delta * 5);
    const h = hold.current;

    if (root.current) {
      // Sit down: drop from standing height onto the seat with a small bounce.
      root.current.position.y = (1 - easeOutBack(k)) * 7 * u;
      root.current.scale.setScalar(0.6 + 0.4 * Math.min(1, k * 1.4));
    }
    if (torso.current) {
      // Slight forward lean (a bit more when reading the card), with slow breathing.
      torso.current.rotation.x = 0.08 + 0.12 * k + 0.06 * h + Math.sin(p * 1.6) * 0.015;
      torso.current.scale.y = 1 + Math.sin(p * 1.6) * 0.012;
    }
    if (neck.current) {
      // Look around the table now and then; look down at the card while holding it.
      const look = Math.sin(p * 0.3) * 0.35 * Math.max(0, Math.sin(p * 0.11));
      neck.current.rotation.y = look * (1 - h) + side * 0.2 * h;
      neck.current.rotation.z = Math.sin(p * 0.45) * 0.06;
      neck.current.rotation.x = -0.1 + 0.3 * h + Math.sin(p * 0.7) * 0.04;
    }
    if (cardUpper.current && cardFore.current && card.current) {
      cardUpper.current.rotation.x = REST.upper + (HOLD.upper - REST.upper) * h;
      cardFore.current.rotation.x = REST.fore + (HOLD.fore - REST.fore) * h + Math.sin(p * 1.3) * 0.04 * h;
      card.current.scale.setScalar(Math.max(0.001, h));
      card.current.visible = h > 0.02;
    }
    if (restFore.current) {
      // Fingers drumming on the knee.
      restFore.current.rotation.x = REST.fore + Math.max(0, Math.sin(p * 3)) * 0.06;
    }
    if (tapShin.current) {
      tapShin.current.rotation.x = Math.PI / 2 - 0.12 + Math.max(0, Math.sin(p * 5)) * 0.1 * k;
    }
  });

  // Stylised, a little smaller than life so the board stays the star; shins still reach the floor.
  const hipW = 1.3 * u;
  const thigh = 7.4 * u;
  const shin = 8.4 * u;
  const upper = 3.6 * u;
  const fore = 3.4 * u;
  const shoulderY = 6.2 * u;
  const shoulderX = 2.4 * u;

  const hand = (
    <mesh position={[0, -fore - 0.2 * u, 0]} material={skin}>
      <sphereGeometry args={[0.7 * u, 10, 8]} />
    </mesh>
  );

  return (
    <group ref={root}>
      {/* Pelvis */}
      <mesh position={[0, 0.5 * u, 0]} scale={[1.9, 1.1, 1.5]} material={body} castShadow>
        <sphereGeometry args={[1.2 * u, 14, 10]} />
      </mesh>

      {/* Legs: thighs forward on the seat, knees past its front edge, shins down to the floor. */}
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
          <mesh position={[0, 0.45 * u, 0]} material={skin}>
            <cylinderGeometry args={[0.5 * u, 0.6 * u, 1 * u, 10]} />
          </mesh>
          <mesh position={[0, 2.1 * u, 0.15 * u]} scale={[1, 1.25, 1.05]} material={skin} castShadow>
            <sphereGeometry args={[1.4 * u, 18, 14]} />
          </mesh>
        </group>

        {/* Card arm: rests on the knee, lifts the card on this player's turn. */}
        <group ref={cardUpper} position={[side * shoulderX, shoulderY, 0]} rotation={[REST.upper, 0, side * 0.1]}>
          <Limb radius={0.65 * u} length={upper} material={body} />
          <group ref={cardFore} position={[0, -upper, 0]} rotation={[REST.fore, 0, 0]}>
            <Limb radius={0.55 * u} length={fore} material={body} />
            {hand}
            {/* The card stands in the fist, its white face towards the player. */}
            <group ref={card} position={[0, -fore - 1.9 * u, 0.2 * u]} visible={false}>
              <mesh castShadow>
                <boxGeometry args={[2.6 * u, 3.6 * u, 0.15 * u]} />
                <meshStandardMaterial color={CARD_RED} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0, 0.09 * u]}>
                <planeGeometry args={[2.1 * u, 3.1 * u]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.7} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Other arm: hand on the knee. */}
        <group position={[-side * shoulderX, shoulderY, 0]} rotation={[REST.upper, 0, -side * 0.1]}>
          <Limb radius={0.65 * u} length={upper} material={body} />
          <group ref={restFore} position={[0, -upper, 0]} rotation={[REST.fore, 0, 0]}>
            <Limb radius={0.55 * u} length={fore} material={body} />
            {hand}
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
 * 8.5u), between `fromX` and `toX`. Spreads them evenly; a crowded sofa squeezes them closer
 * and makes them a bit narrower. Hips sit far enough forward that the knees clear the seat edge.
 */
export function SofaSitters({
  sitters,
  fromX,
  toX,
  u,
  holderId,
}: {
  sitters: Sitter[];
  fromX: number;
  toX: number;
  u: number;
  /** The player explaining this turn: they hold up a card. */
  holderId?: string | null;
}) {
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
  const hipZ = 10 * u; // knees end at ~17.4u, past the 16u-deep seat
  const spacing = Math.min(6.5 * u, (toX - fromX) / sitters.length);
  const scale = Math.min(1, spacing / (5.5 * u));
  const start = (fromX + toX) / 2 - ((sitters.length - 1) * spacing) / 2;
  return (
    <group ref={group}>
      {sitters.map((s, i) => (
        <group key={s.id} position={[start + i * spacing, seatY, hipZ]} scale={[scale, 1, 1]}>
          <SittingPlayer id={s.id} color={s.color} u={u} holdingCard={s.id === holderId} />
        </group>
      ))}
    </group>
  );
}
