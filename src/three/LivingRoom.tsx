import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

import type { BoardLayout } from './boardLayout';
import { SofaSitters, type Sitter } from './SittingPlayer';

/**
 * A cosy "dollhouse" living room around the game table, in the isometric
 * low-poly style: wooden floor, rug, coffee table (the board sits on it),
 * sofas with cushions, framed pictures, wall lamps, a curtained window,
 * a TV, a plant and a slatted wall with a mirror.
 *
 * Everything is built from simple primitives in "room units" (u), scaled with
 * the board so the proportions hold for every board size. Any wall standing
 * between the camera and the table fades away, so orbiting never hides the board.
 */

const WOOD_DARK = '#5B3F2C';
const WOOD_TABLE = '#7A5236';
const SOFA = '#EEEBE4';
const CUSHION = '#F3F1EC';
const MUSTARD = '#E3B021';
const THROW = '#7E9A6B';
const WALL_WARM = '#E7DDD0';
const WALL_LIGHT = '#F2EFEA';
const SLATS = '#2F2620';
const CURTAIN = '#C9C6AE';
const POT = '#3A302A';
const LEAF = '#5F8A55';
const BRASS = '#C9A45C';

export interface TableGeometry {
  /** Top of the coffee table is y = 0 (the board sits on it); the floor is at -height. */
  height: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Room unit: 1u ≈ 5 cm when the board is 10 wide. */
  u: number;
}

export function tableGeometry(layout: BoardLayout): TableGeometry {
  const u = layout.width / 10;
  // The board, decks and timer need this much room…
  const need = {
    minX: -layout.width / 2 - 0.9,
    maxX: layout.width / 2 + 0.9,
    minZ: -layout.depth / 2 - 3.1,
    maxZ: layout.depth / 2 + 0.9,
  };
  // …but a real coffee table (≈ 1.3 m × 0.75 m) is roomier than the board.
  const cz = (need.minZ + need.maxZ) / 2;
  return {
    height: 9 * u,
    minX: Math.min(need.minX, -13 * u),
    maxX: Math.max(need.maxX, 13 * u),
    minZ: Math.min(need.minZ, cz - 7.5 * u),
    maxZ: Math.max(need.maxZ, cz + 7.5 * u),
    u,
  };
}

function Box({
  size,
  position,
  color,
  rotation,
  emissive,
  roughness = 0.8,
  castShadow,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  emissive?: string;
  roughness?: number;
  castShadow?: boolean;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 1 : 0}
      />
    </mesh>
  );
}

/** The coffee table the board stands on. */
function CoffeeTable({ t }: { t: TableGeometry }) {
  const w = t.maxX - t.minX;
  const d = t.maxZ - t.minZ;
  const cx = (t.minX + t.maxX) / 2;
  const cz = (t.minZ + t.maxZ) / 2;
  const top = 0.5 * t.u;
  const leg = 0.9 * t.u;
  const legs: [number, number][] = [
    [t.minX + leg, t.minZ + leg],
    [t.maxX - leg, t.minZ + leg],
    [t.minX + leg, t.maxZ - leg],
    [t.maxX - leg, t.maxZ - leg],
  ];
  return (
    <group>
      <mesh position={[cx, -top / 2, cz]} receiveShadow castShadow>
        <boxGeometry args={[w, top, d]} />
        <meshStandardMaterial color={WOOD_TABLE} roughness={0.55} />
      </mesh>
      {/* Lower shelf */}
      <Box size={[w * 0.86, 0.3 * t.u, d * 0.8]} position={[cx, -t.height * 0.72, cz]} color={WOOD_DARK} />
      {legs.map(([x, z], i) => (
        <Box key={i} size={[leg, t.height - top, leg]} position={[x, -(t.height + top) / 2, z]} color={WOOD_DARK} />
      ))}
    </group>
  );
}

function Sofa({ width, u, chaise }: { width: number; u: number; chaise?: boolean }) {
  // Local frame: sofa front faces +z, back against z = 0, floor at y = 0.
  const seatD = 16 * u;
  const seatH = 7 * u;
  const legH = 1.5 * u;
  const backH = 9 * u;
  const arm = 3 * u;
  const cushions = Math.max(2, Math.round(width / (13 * u)));
  const cw = (width - 2 * arm) / cushions;
  return (
    <group>
      <Box size={[width, seatH, seatD]} position={[0, legH + seatH / 2, seatD / 2]} color={SOFA} />
      <Box size={[width, backH, 4 * u]} position={[0, legH + seatH + backH / 2 - 1 * u, 2 * u]} color={SOFA} />
      <Box
        size={[arm, seatH + 4 * u, seatD]}
        position={[-width / 2 + arm / 2, legH + (seatH + 4 * u) / 2, seatD / 2]}
        color={SOFA}
      />
      <Box
        size={[arm, seatH + 4 * u, seatD]}
        position={[width / 2 - arm / 2, legH + (seatH + 4 * u) / 2, seatD / 2]}
        color={SOFA}
      />
      {Array.from({ length: cushions }, (_, i) => (
        <Box
          key={i}
          size={[cw * 0.94, 7 * u, 3 * u]}
          position={[-width / 2 + arm + cw * (i + 0.5), legH + seatH + 3.5 * u, 5.5 * u]}
          rotation={[-0.25, 0, 0]}
          color={CUSHION}
        />
      ))}
      {/* Mustard throw pillows and a green blanket, like the reference room. */}
      <Box
        size={[5 * u, 5 * u, 1.6 * u]}
        position={[-width / 2 + arm + 3.5 * u, legH + seatH + 3 * u, 8 * u]}
        rotation={[-0.3, 0.3, 0.1]}
        color={MUSTARD}
      />
      <Box
        size={[5.5 * u, 5.5 * u, 1.6 * u]}
        position={[width / 2 - arm - 4 * u, legH + seatH + 3 * u, 8 * u]}
        rotation={[-0.3, -0.25, -0.08]}
        color={MUSTARD}
      />
      <Box
        size={[5 * u, 5 * u, 1.6 * u]}
        position={[width / 2 - arm - 9 * u, legH + seatH + 2.8 * u, 8.5 * u]}
        rotation={[-0.3, 0.1, 0.05]}
        color={MUSTARD}
      />
      <Box
        size={[10 * u, 0.6 * u, 12 * u]}
        position={[-width * 0.12, legH + seatH + 0.3 * u, 10 * u]}
        rotation={[0, 0.15, 0]}
        color={THROW}
      />
      {chaise && (
        <Box
          size={[16 * u, seatH, 14 * u]}
          position={[width / 2 - 8 * u, legH + seatH / 2, seatD + 7 * u]}
          color={SOFA}
        />
      )}
      {[-1, 1].map((sx) =>
        [2 * u, seatD - 2 * u].map((z) => (
          <Box
            key={`${sx}-${z}`}
            size={[1 * u, legH, 1 * u]}
            position={[sx * (width / 2 - 2 * u), legH / 2, z]}
            color={SLATS}
          />
        )),
      )}
    </group>
  );
}

function Plant({ u }: { u: number }) {
  const leaves: [number, number, number, number][] = [
    [0, 26, 0, 4.5],
    [2.5, 22, 1, 3.5],
    [-2.5, 20, -1, 3.8],
    [1, 17, -2.2, 3.2],
    [-1.5, 29, 1.5, 3],
  ];
  return (
    <group>
      <mesh position={[0, 4 * u, 0]}>
        <cylinderGeometry args={[4 * u, 3.2 * u, 8 * u, 24]} />
        <meshStandardMaterial color={POT} roughness={0.6} />
      </mesh>
      <mesh position={[0, 16 * u, 0]}>
        <cylinderGeometry args={[0.3 * u, 0.4 * u, 18 * u, 6]} />
        <meshStandardMaterial color="#5C4630" />
      </mesh>
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x * u, y * u, z * u]} scale={[1, 0.7, 1]}>
          <icosahedronGeometry args={[r * u, 0]} />
          <meshStandardMaterial color={LEAF} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Lamp({ u }: { u: number }) {
  return (
    <group>
      <mesh position={[0, 4 * u, 0]}>
        <cylinderGeometry args={[4 * u, 4 * u, 8 * u, 24]} />
        <meshStandardMaterial color={SLATS} roughness={0.7} />
      </mesh>
      <mesh position={[0, 10 * u, 0]}>
        <cylinderGeometry args={[0.4 * u, 0.6 * u, 4 * u, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 13.5 * u, 0]}>
        <cylinderGeometry args={[2.6 * u, 3.4 * u, 4 * u, 24, 1, true]} />
        <meshStandardMaterial color="#FFF6E0" emissive="#FFE3A3" emissiveIntensity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Sconce({ u }: { u: number }) {
  return (
    <group>
      <Box size={[1.2 * u, 1.2 * u, 2 * u]} position={[0, 0, 1 * u]} color={BRASS} roughness={0.3} />
      <mesh position={[0, -0.5 * u, 2.8 * u]}>
        <sphereGeometry args={[1.8 * u, 20, 16]} />
        <meshStandardMaterial color="#FFF8E7" emissive="#FFE6B0" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function Picture({ u, color }: { u: number; color: string }) {
  return (
    <group>
      <Box size={[8 * u, 10.5 * u, 0.6 * u]} position={[0, 0, 0.3 * u]} color="#1C1C1C" />
      <Box size={[6.6 * u, 9 * u, 0.1 * u]} position={[0, 0, 0.65 * u]} color="#F4F1EA" />
      {/* A leafy shape standing in for the botanical prints. */}
      <mesh position={[0, -0.3 * u, 0.75 * u]} rotation={[0, 0, 0.5]} scale={[1, 1.8, 1]}>
        <circleGeometry args={[2.2 * u, 5]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

interface WallProps {
  /** Centre of the wall's base (floor level). */
  position: THREE.Vector3;
  /** Rotation so the wall's local +z points into the room. */
  rotationY: number;
  length: number;
  height: number;
  color: string;
  u: number;
  children?: ReactNode;
}

/** A wall (with its decorations) that hides itself whenever the camera is outside the room behind it. */
function Wall({ position, rotationY, length, height, color, u, children }: WallProps) {
  const group = useRef<THREE.Group>(null);
  const inward = useMemo(() => new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY)), [rotationY]);
  useFrame(({ camera }) => {
    if (!group.current) return;
    const toCamera = camera.position.clone().sub(position);
    group.current.visible = toCamera.dot(inward) > 1.5 * u;
  });
  return (
    <group ref={group} position={position} rotation-y={rotationY}>
      <Box size={[length, height, 1 * u]} position={[0, height / 2, -0.5 * u]} color={color} roughness={0.95} />
      {/* Skirting board */}
      <Box size={[length, 1.6 * u, 0.4 * u]} position={[0, 0.8 * u, 0.2 * u]} color="#FAF8F4" />
      {children}
    </group>
  );
}

export function LivingRoom({
  layout,
  floorTexture,
  sitters = [],
}: {
  layout: BoardLayout;
  floorTexture: THREE.Texture;
  /** Online players, seated on the two sofas (in team order, so teammates sit together). */
  sitters?: Sitter[];
}) {
  const t = useMemo(() => tableGeometry(layout), [layout]);
  const u = t.u;
  const R = 34 * u; // half the room width
  const H = 48 * u; // wall height
  const cx = (t.minX + t.maxX) / 2;
  const cz = (t.minZ + t.maxZ) / 2;
  const floorY = -t.height;

  const floor = useMemo(() => {
    const tex = floorTexture.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set((2 * R) / (22 * u), (2 * R) / (22 * u));
    tex.needsUpdate = true;
    return tex;
  }, [floorTexture, R, u]);

  const at = (x: number, z: number) => new THREE.Vector3(cx + x, floorY, cz + z);

  // Fill both sofas in proportion to their length (44u at the back, 34u at the front).
  const backCount = Math.round((sitters.length * 44) / 78);
  const backSitters = sitters.slice(0, backCount);
  const frontSitters = sitters.slice(backCount);

  return (
    <group>
      <CoffeeTable t={t} />

      {/* Floor and rug */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, floorY, cz]} receiveShadow>
        <planeGeometry args={[2 * R, 2 * R]} />
        <meshStandardMaterial map={floor} roughness={0.7} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, floorY + 0.05 * u, cz]} receiveShadow>
        <planeGeometry args={[46 * u, 36 * u]} />
        <meshStandardMaterial color="#DCCBA4" roughness={1} />
      </mesh>

      {/* Back wall: sofa, three botanical prints and two wall lamps. */}
      <Wall position={at(0, -R)} rotationY={0} length={2 * R} height={H} color={WALL_WARM} u={u}>
        <Box size={[2 * R, 0.8 * u, 0.6 * u]} position={[0, 24 * u, 0.3 * u]} color={SLATS} />
        {[-10, 0, 10].map((x, i) => (
          <group key={x} position={[x * u, 33 * u, 0]}>
            <Picture u={u} color={['#6F9A68', '#4E7D5E', '#8FAE7C'][i]} />
          </group>
        ))}
        {[-18, 18].map((x) => (
          <group key={x} position={[x * u, 31 * u, 0]}>
            <Sconce u={u} />
          </group>
        ))}
        <group position={[0, 0, 1 * u]}>
          <Sofa width={44 * u} u={u} chaise />
          <SofaSitters sitters={backSitters} width={44 * u} u={u} />
        </group>
      </Wall>

      {/* Left wall: big window with curtains. */}
      <Wall position={at(-R, 0)} rotationY={Math.PI / 2} length={2 * R} height={H} color={WALL_LIGHT} u={u}>
        <Box size={[28 * u, 32 * u, 0.3 * u]} position={[0, 22 * u, 0.2 * u]} color="#DCEAF4" emissive="#BFD9EE" />
        {[-14, 0, 14].map((x) => (
          <Box key={x} size={[1.2 * u, 32 * u, 1 * u]} position={[x * u, 22 * u, 0.5 * u]} color={SLATS} />
        ))}
        <Box size={[28 * u, 1.2 * u, 1 * u]} position={[0, 38 * u, 0.5 * u]} color={SLATS} />
        <Box size={[40 * u, 1.2 * u, 2 * u]} position={[0, 41 * u, 2.5 * u]} color={SLATS} />
        {[-1, 1].map((side) =>
          [0, 1, 2, 3].map((f) => (
            <mesh key={`${side}-${f}`} position={[side * (16 + f * 1.4) * u, 20.5 * u, (2.5 + (f % 2) * 0.8) * u]}>
              <cylinderGeometry args={[1 * u, 1.2 * u, 41 * u, 10]} />
              <meshStandardMaterial color={CURTAIN} roughness={1} />
            </mesh>
          )),
        )}
        <group position={[-26 * u, 0, 6 * u]}>
          <Plant u={u} />
        </group>
      </Wall>

      {/* Right wall: dark slatted panel with a tall mirror, and the TV. */}
      <Wall position={at(R, 0)} rotationY={-Math.PI / 2} length={2 * R} height={H} color={WALL_WARM} u={u}>
        {Array.from({ length: 12 }, (_, i) => (
          <Box
            key={i}
            size={[0.9 * u, H - 2 * u, 0.8 * u]}
            position={[(18 + i * 1.3) * u, H / 2, 0.4 * u]}
            color={SLATS}
          />
        ))}
        <Box size={[8 * u, 30 * u, 0.4 * u]} position={[25 * u, 18 * u, 1.2 * u]} color="#B9C8CF" roughness={0.1} />
        <Box size={[30 * u, 7 * u, 7 * u]} position={[-8 * u, 3.5 * u, 3.5 * u]} color="#3B332D" />
        <Box size={[26 * u, 14 * u, 0.8 * u]} position={[-8 * u, 17 * u, 3 * u]} color="#17181A" roughness={0.3} />
        <group position={[-26 * u, 0, 6 * u]}>
          <Lamp u={u} />
        </group>
      </Wall>

      {/* Front wall: the second sofa, facing the table. */}
      <Wall position={at(0, R)} rotationY={Math.PI} length={2 * R} height={H} color={WALL_LIGHT} u={u}>
        <group position={[4 * u, 0, 1 * u]}>
          <Sofa width={34 * u} u={u} />
          <SofaSitters sitters={frontSitters} width={34 * u} u={u} />
        </group>
      </Wall>
    </group>
  );
}
