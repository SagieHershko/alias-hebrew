import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';

import type { Team } from '../game/types';
import { computeLayout, type BoardLayout } from './boardLayout';

const DISCS = require('../../assets/3d/discs.png');
const LOGO = require('../../assets/3d/logo.png');
const CARD = require('../../assets/3d/card.png');

const RED = '#E30613';
const STAGE = '#2A2C31';
const DISC_RADIUS = 0.36;
const DISC_HEIGHT = 0.07;
const BOARD_HEIGHT = 0.22;
const TOP = BOARD_HEIGHT + DISC_HEIGHT; // y of the disc tops, where pawns stand
const HOP_SPEED = 3.2; // squares per second
const HOP_DELAY = 0.7; // seconds before pawns start moving

/** fiber-native loads `require()` asset ids directly; the web needs a URL. */
const src = (mod: number) => (Platform.OS === 'web' ? Asset.fromModule(mod).uri : mod) as string;

interface Props {
  teams: Team[];
  target: number;
  activeTeamId?: string;
  /** Scores before the last turn; pawns hop from here to their current score. */
  fromScores?: Record<string, number>;
  /** The winner's pawn celebrates. */
  winnerId?: string | null;
  style?: StyleProp<ViewStyle>;
}

/** Realistic 3D Alias board: red board, raised speech-bubble squares, pawns, decks and a sand timer. */
export function Board3D({ style, ...scene }: Props) {
  return (
    <View style={[styles.stage, style]}>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 32, position: [0, 10, 10] }}>
        <color attach="background" args={[STAGE]} />
        <Suspense fallback={null}>
          <Scene {...scene} />
        </Suspense>
      </Canvas>
    </View>
  );
}

function Scene({ teams, target, activeTeamId, fromScores, winnerId }: Omit<Props, 'style'>) {
  const layout = useMemo(() => computeLayout(target), [target]);
  const [discTex, logoTex, cardTex] = useLoader(THREE.TextureLoader, [src(DISCS), src(LOGO), src(CARD)]);
  for (const t of [discTex, logoTex, cardTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  }

  // On a tall (portrait) canvas the board is turned lengthwise so it fills the screen.
  const { size } = useThree();
  const yaw = size.width / Math.max(1, size.height) < 0.8 ? Math.PI / 2 : 0;

  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // A slow idle sway so the board feels alive.
    if (group.current) group.current.rotation.y = yaw + Math.sin(clock.elapsedTime * 0.25) * 0.05;
  });

  return (
    <>
      <FitCamera layout={layout} yaw={yaw} />
      <hemisphereLight args={['#ffffff', '#5a4440', 1.3]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[-layout.width * 0.4, layout.width, layout.depth * 0.6]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-layout.width}
        shadow-camera-right={layout.width}
        shadow-camera-top={layout.width}
        shadow-camera-bottom={-layout.width}
        shadow-bias={-0.0005}
      />
      <group ref={group}>
        <BoardBase layout={layout} logo={logoTex} />
        <Discs layout={layout} texture={discTex} faceYaw={-yaw} />
        <Props3D layout={layout} cardTexture={cardTex} />
        {teams.map((t) => (
          <Pawn
            key={t.id}
            team={t}
            teams={teams}
            layout={layout}
            from={fromScores?.[t.id] ?? t.score}
            active={t.id === activeTeamId}
            celebrating={t.id === winnerId}
          />
        ))}
        {/* Soft contact shadows on the "table". */}
        <mesh rotation-x={-Math.PI / 2} position-y={0.001} receiveShadow>
          <planeGeometry args={[layout.width * 4, layout.width * 4]} />
          <shadowMaterial opacity={0.35} />
        </mesh>
      </group>
    </>
  );
}

/** Places the camera at a board-game angle and fits the whole table to the canvas. */
function FitCamera({ layout, yaw }: { layout: BoardLayout; yaw: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.aspect = size.width / Math.max(1, size.height);
    const elev = THREE.MathUtils.degToRad(yaw ? 62 : 50);
    const center = new THREE.Vector3(yaw ? -0.9 : 0, 0, yaw ? 0 : -0.9);
    // Everything that must stay in frame: the board plus the decks and timer behind it.
    const halfW = layout.width / 2;
    const corners: THREE.Vector3[] = [];
    for (const x of [-halfW, halfW])
      for (const z of [-layout.depth / 2 - 2.4, layout.depth / 2])
        for (const y of [0, 1.6]) corners.push(new THREE.Vector3(x, y, z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw));
    // Zoom in until the furthest corner touches the edge of the view.
    let dist = layout.width * 2;
    for (let i = 0; i < 6; i++) {
      cam.position.set(0, center.y + Math.sin(elev) * dist, center.z + Math.cos(elev) * dist);
      cam.lookAt(center);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      const reach = Math.max(
        ...corners.map((c) => {
          const p = c.clone().project(cam);
          return Math.max(Math.abs(p.x), Math.abs(p.y));
        }),
      );
      dist *= reach / 0.94;
    }
    cam.near = 0.1;
    cam.far = dist * 4;
    cam.updateProjectionMatrix();
  }, [camera, size, layout, yaw]);
  return null;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function BoardBase({ layout, logo }: { layout: BoardLayout; logo: THREE.Texture }) {
  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRect(layout.width, layout.depth, 0.35), {
      depth: BOARD_HEIGHT - 0.04,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.03,
      bevelSegments: 3,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.02, 0);
    return g;
  }, [layout]);
  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={RED} roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh
        position={[layout.logo.x, BOARD_HEIGHT + 0.004, layout.logo.z]}
        rotation={[-Math.PI / 2, 0, 0.12]}
      >
        <planeGeometry args={[layout.logo.width, layout.logo.height]} />
        <meshStandardMaterial map={logo} transparent roughness={0.6} />
      </mesh>
    </>
  );
}

/**
 * Texture-atlas cell of a square. Like the printed board, squares are numbered
 * 1–8 over and over; the start is a big glowing 1 and the finish is the ✌ disc.
 */
function atlasCell(index: number, target: number) {
  if (index === target) return 0;
  if (index === 0) return 63;
  return (index % 8) + 1;
}

function atlasPlane(cell: number, radius: number) {
  const g = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const col = cell % 8;
  const row = Math.floor(cell / 8);
  const u0 = col / 8;
  const u1 = (col + 1) / 8;
  const v1 = 1 - row / 8;
  const v0 = 1 - (row + 1) / 8;
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2));
  g.rotateX(-Math.PI / 2);
  return g;
}

/** `faceYaw` turns the numbers so they stay upright when the whole board is rotated. */
function Discs({ layout, texture, faceYaw }: { layout: BoardLayout; texture: THREE.Texture; faceYaw: number }) {
  const target = layout.squares.length - 1;
  const discs = useMemo(
    () =>
      layout.squares.map((sq, i) => {
        const special = i === 0 || i === target;
        const radius = special ? DISC_RADIUS * 1.3 : DISC_RADIUS;
        // Speech-bubble tail points "backwards" along the track, like the printed board.
        const next = layout.squares[Math.min(target, i + 1)];
        const prev = layout.squares[Math.max(0, i - 1)];
        const angle = Math.atan2(next.x - prev.x, next.z - prev.z) + Math.PI * 0.75;
        return { ...sq, radius, angle, face: atlasPlane(atlasCell(i, target), radius * 0.98) };
      }),
    [layout, target],
  );
  return (
    <>
      {discs.map((d, i) => (
        <group key={i} position={[d.x, BOARD_HEIGHT, d.z]}>
          {i === 0 && (
            <mesh rotation-x={-Math.PI / 2} position-y={0.003}>
              <circleGeometry args={[d.radius * 1.6, 40]} />
              <meshBasicMaterial color="#FFB74D" transparent opacity={0.55} />
            </mesh>
          )}
          <mesh position-y={DISC_HEIGHT / 2} castShadow receiveShadow>
            <cylinderGeometry args={[d.radius, d.radius, DISC_HEIGHT, 40]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          <mesh
            position={[Math.sin(d.angle) * d.radius * 0.85, DISC_HEIGHT / 2, Math.cos(d.angle) * d.radius * 0.85]}
            rotation-y={d.angle + Math.PI / 4}
            castShadow
          >
            <boxGeometry args={[d.radius * 0.5, DISC_HEIGHT, d.radius * 0.5]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          <mesh geometry={d.face} position-y={DISC_HEIGHT + 0.002} rotation-y={faceYaw}>
            <meshStandardMaterial map={texture} transparent alphaTest={0.3} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const PAWN_PROFILE = [
  [0, 0], [0.25, 0], [0.26, 0.035], [0.21, 0.08], [0.15, 0.13], [0.115, 0.22],
  [0.1, 0.4], [0.135, 0.44], [0.14, 0.48], [0.09, 0.51], [0, 0.52],
].map(([x, y]) => new THREE.Vector2(x, y));

function slotOffset(team: Team, teams: Team[]) {
  // Pawns sharing a square stand in a small ring instead of inside each other.
  const sharing = teams.filter((t) => t.score === team.score);
  if (sharing.length < 2) return { x: 0, z: 0 };
  const i = sharing.findIndex((t) => t.id === team.id);
  const a = (i / sharing.length) * Math.PI * 2;
  return { x: Math.cos(a) * 0.22, z: Math.sin(a) * 0.22 };
}

interface PawnProps {
  team: Team;
  teams: Team[];
  layout: BoardLayout;
  from: number;
  active: boolean;
  celebrating: boolean;
}

function Pawn({ team, teams, layout, from, active, celebrating }: PawnProps) {
  const ref = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const progress = useRef(from);
  const start = useRef<number | null>(null);
  const offset = slotOffset(team, teams);
  const last = layout.squares.length - 1;

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (start.current === null) start.current = t;
    const to = team.score;
    if (t - start.current > HOP_DELAY && progress.current !== to) {
      const step = HOP_SPEED * Math.min(delta, 0.1);
      progress.current =
        to > progress.current ? Math.min(to, progress.current + step) : Math.max(to, progress.current - step);
    }
    const p = Math.max(0, Math.min(last, progress.current));
    const i = Math.floor(p);
    const f = p - i;
    const a = layout.squares[i];
    const b = layout.squares[Math.min(last, i + 1)];
    const moving = progress.current !== to;
    const hop = moving ? Math.sin(f * Math.PI) * 0.55 : 0;
    const bob = celebrating ? Math.abs(Math.sin(t * 5)) * 0.6 : active && !moving ? Math.sin(t * 3) * 0.05 + 0.05 : 0;
    g.position.set(a.x + (b.x - a.x) * f + offset.x, TOP + hop + bob, a.z + (b.z - a.z) * f + offset.z);
    g.rotation.y = celebrating ? t * 3 : 0;
    if (ring.current) {
      ring.current.visible = active || celebrating;
      ring.current.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    }
  });

  const geometry = useMemo(() => new THREE.LatheGeometry(PAWN_PROFILE, 40), []);
  return (
    <group ref={ref}>
      <group scale={1.35}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={team.color} roughness={0.28} metalness={0.05} />
      </mesh>
      <mesh position-y={0.63} castShadow>
        <sphereGeometry args={[0.13, 32, 24]} />
        <meshStandardMaterial color={team.color} roughness={0.28} metalness={0.05} />
      </mesh>
      </group>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[0.4, 0.5, 40]} />
        <meshBasicMaterial color="#FFD54F" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

const TIMER_GLASS = [
  [0.22, 0], [0.25, 0.18], [0.2, 0.36], [0.07, 0.5], [0.2, 0.64], [0.25, 0.82], [0.22, 1.0],
].map(([x, y]) => new THREE.Vector2(x, y));

/** Card decks and the sand timer, placed behind the far-right corner like in the box photo. */
function Props3D({ layout, cardTexture }: { layout: BoardLayout; cardTexture: THREE.Texture }) {
  const glass = useMemo(() => new THREE.LatheGeometry(TIMER_GLASS, 32), []);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.7 }), []);
  const top = useMemo(() => new THREE.MeshStandardMaterial({ map: cardTexture, roughness: 0.45 }), [cardTexture]);
  const deckMaterials = [side, side, top, side, side, side];
  const baseX = layout.width / 2 - 1.7;
  const baseZ = -layout.depth / 2 - 1.35;
  const decks: [number, number, number][] = [
    [baseX - 0.55, baseZ - 0.35, 0.18],
    [baseX + 0.6, baseZ - 0.55, -0.1],
    [baseX - 0.35, baseZ + 0.75, 0.05],
    [baseX + 0.85, baseZ + 0.55, 0.22],
  ];
  return (
    <>
      {decks.map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.2, z]} rotation-y={r} material={deckMaterials} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.4, 1.33]} />
        </mesh>
      ))}
      <group position={[baseX - 2, 0, baseZ + 0.2]} scale={1.3}>
        <mesh position-y={0.04} castShadow>
          <cylinderGeometry args={[0.3, 0.32, 0.08, 32]} />
          <meshStandardMaterial color={RED} roughness={0.35} />
        </mesh>
        <mesh geometry={glass} position-y={0.08} castShadow>
          <meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
        <mesh position-y={0.2}>
          <coneGeometry args={[0.2, 0.22, 24]} />
          <meshStandardMaterial color="#F3E3C3" roughness={0.9} />
        </mesh>
        <mesh position-y={1.12} castShadow>
          <cylinderGeometry args={[0.32, 0.3, 0.08, 32]} />
          <meshStandardMaterial color={RED} roughness={0.35} />
        </mesh>
      </group>
    </>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: STAGE, overflow: 'hidden' },
});
