import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { PanResponder, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';

import type { Team } from '../game/types';
import { TIMER_FLIP_MS } from '../game/gameReducer';
import { playSound } from '../sound/sounds';
import { computeLayout, type BoardLayout } from './boardLayout';
import { LivingRoom } from './LivingRoom';

const DISCS = require('../../assets/3d/discs.png');
const LOGO = require('../../assets/3d/logo.png');
const CARD = require('../../assets/3d/card.png');
const FLOOR = require('../../assets/3d/floor.png');

const RED = '#E30613';
const STAGE = '#CBC5A9'; // backdrop around the living room, like the reference render
const SAND = '#E2A93B';
const DISC_RADIUS = 0.36;
const DISC_HEIGHT = 0.07;
const BOARD_HEIGHT = 0.22;
const TOP = BOARD_HEIGHT + DISC_HEIGHT; // y of the disc tops, where pawns stand
const HOP_SPEED = 3.2; // squares per second
const HOP_DELAY = 0.7; // seconds before pawns start moving
const CARD_FLIGHT = 0.5; // seconds for a card to fly from the deck to the camera

const MIN_ELEVATION = THREE.MathUtils.degToRad(18);
const MAX_ELEVATION = THREE.MathUtils.degToRad(88);
const MIN_ZOOM = 0.5; // 1 = the whole table exactly fits the screen
const MAX_ZOOM = 2.8; // zoomed out: the whole living room
// Starting zoom: on a wide screen the living room shows around the table; on a tall phone screen
// the board stays big enough to read.
const DEFAULT_ZOOM_WIDE = 1.75;
const DEFAULT_ZOOM_TALL = 1.1;

/** fiber-native loads `require()` asset ids directly; the web needs a URL. */
const src = (mod: number) => (Platform.OS === 'web' ? Asset.fromModule(mod).uri : mod) as string;

/** Camera orbit around the board. null angles mean "the default view for this screen shape". */
export interface OrbitView {
  azimuth: number | null;
  elevation: number | null;
  zoom: number | null;
  lastInteraction: number;
  /** Angles actually on screen (default + idle sway), written by the camera rig. */
  shownAzimuth: number;
  shownElevation: number;
  shownZoom: number;
  /** Pixels covered by UI panels at the top / bottom; the table is fitted into the space between. */
  insetTop: number;
  insetBottom: number;
}

export const createView = (): OrbitView => ({
  azimuth: null,
  elevation: null,
  zoom: null,
  lastInteraction: 0,
  shownAzimuth: 0,
  shownElevation: 0,
  shownZoom: 1,
  insetTop: 0,
  insetBottom: 0,
});

export function resetView(view: OrbitView) {
  view.azimuth = null;
  view.elevation = null;
  view.zoom = null;
  view.lastInteraction = 0;
}

/**
 * The sand timer is the turn clock. Bumping `turnId` flips it over; `progress`
 * (0 → 1) is how much of the turn has passed, i.e. how much sand has fallen.
 */
export interface SandState {
  turnId: number;
  progress: number;
}

interface Props {
  teams: Team[];
  target: number;
  activeTeamId?: string;
  /** Scores before the last turn; pawns hop from here to their current score. */
  fromScores?: Record<string, number>;
  /** The winner's pawn celebrates. */
  winnerId?: string | null;
  /** Drag to orbit, pinch or mouse wheel to zoom. */
  interactive?: boolean;
  view?: RefObject<OrbitView>;
  sand?: RefObject<SandState>;
  /** Squares drawn as steal squares. */
  stealSquares?: readonly number[];
  /** Bumped every time a card is drawn: a card flies up from the deck. */
  cardsDrawn?: number;
  style?: StyleProp<ViewStyle>;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Realistic 3D Alias table: board, raised speech-bubble squares, pawns, card decks and a sand timer. */
export function Board3D({ style, interactive = false, view: viewProp, sand: sandProp, ...scene }: Props) {
  const ownView = useRef<OrbitView>(createView());
  const ownSand = useRef<SandState>({ turnId: 0, progress: 1 });
  const view = viewProp ?? ownView;
  const sand = sandProp ?? ownSand;

  const gestures = useMemo(() => {
    let start = { az: 0, el: 0, zoom: 1 };
    let pinch: number | null = null;
    const touchDistance = (touches: { pageX: number; pageY: number }[]) =>
      Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const v = view.current!;
        start = { az: v.shownAzimuth, el: v.shownElevation, zoom: v.shownZoom };
        pinch = null;
      },
      onPanResponderMove: (evt, g) => {
        const v = view.current!;
        v.lastInteraction = Date.now();
        const touches = evt.nativeEvent.touches as unknown as { pageX: number; pageY: number }[] | undefined;
        if (touches && touches.length >= 2) {
          const d = touchDistance(touches);
          if (pinch === null) {
            pinch = d;
            start.zoom = v.shownZoom;
          }
          v.zoom = clamp((start.zoom * pinch) / d, MIN_ZOOM, MAX_ZOOM);
          return;
        }
        v.azimuth = start.az - g.dx * 0.008;
        v.elevation = clamp(start.el + g.dy * 0.006, MIN_ELEVATION, MAX_ELEVATION);
      },
    });
  }, [view]);

  return (
    <View style={[styles.stage, interactive && styles.touchNone, style]} {...(interactive ? gestures.panHandlers : {})}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 32, position: [0, 10, 10] }}
        onWheel={
          interactive
            ? (e: { deltaY: number }) => {
                const v = view.current!;
                v.zoom = clamp(v.shownZoom * (1 + e.deltaY * 0.0012), MIN_ZOOM, MAX_ZOOM);
                v.lastInteraction = Date.now();
              }
            : undefined
        }
      >
        <color attach="background" args={[STAGE]} />
        <Suspense fallback={null}>
          <Scene {...scene} view={view} sand={sand} />
        </Suspense>
      </Canvas>
    </View>
  );
}

type SceneProps = Omit<Props, 'style' | 'interactive' | 'view' | 'sand'> & {
  view: RefObject<OrbitView>;
  sand: RefObject<SandState>;
};

function Scene({
  teams,
  target,
  activeTeamId,
  fromScores,
  winnerId,
  view,
  sand,
  cardsDrawn = 0,
  stealSquares = [],
}: SceneProps) {
  const layout = useMemo(() => computeLayout(target), [target]);
  const [discTex, logoTex, cardTex, floorTex] = useLoader(THREE.TextureLoader, [
    src(DISCS),
    src(LOGO),
    src(CARD),
    src(FLOOR),
  ]);
  for (const t of [discTex, logoTex, cardTex, floorTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  }
  const props = useMemo(() => propPositions(layout), [layout]);

  return (
    <>
      <CameraRig layout={layout} view={view} />
      <hemisphereLight args={['#fff7ea', '#8a6a50', 1.25]} />
      <ambientLight intensity={0.35} />
      {/* Soft daylight from the window side. */}
      <directionalLight
        position={[-layout.width * 3, layout.width * 2, layout.width]}
        intensity={0.6}
        color="#EAF3FF"
      />
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
      <LivingRoom layout={layout} floorTexture={floorTex} />
      <BoardBase layout={layout} logo={logoTex} />
      <Discs layout={layout} texture={discTex} view={view} stealSquares={stealSquares} />
      <Decks decks={props.decks} cardTexture={cardTex} />
      <SandTimer position={props.timer} sand={sand} />
      <CardFlight from={props.drawFrom} cardsDrawn={cardsDrawn} texture={cardTex} />
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
    </>
  );
}

/** Bounds of everything on the table: the board plus the decks and timer behind its far edge. */
function tableBounds(layout: BoardLayout) {
  const halfW = layout.width / 2;
  const far = -layout.depth / 2 - 2.8;
  const near = layout.depth / 2;
  const corners: THREE.Vector3[] = [];
  for (const x of [-halfW, halfW])
    for (const z of [far, near]) for (const y of [0, 2.6]) corners.push(new THREE.Vector3(x, y, z));
  return { corners, center: new THREE.Vector3(0, 0.3, (far + near) / 2) };
}

/**
 * Orbit camera: always aims at the middle of the table and, whatever the angle,
 * backs off just enough to keep the whole table on screen (times the user's zoom).
 * The table is fitted into the free band between the UI panels, not the whole canvas.
 */
function CameraRig({ layout, view }: { layout: BoardLayout; view: RefObject<OrbitView> }) {
  const { camera, size } = useThree();
  const bounds = useMemo(() => tableBounds(layout), [layout]);
  const dist = useRef(layout.width * 2);
  const insets = useRef({ top: 0, bottom: 0 });
  const probe = useMemo(() => new THREE.PerspectiveCamera(), []);

  useFrame(({ clock }, delta) => {
    const v = view.current;
    if (!v) return;
    const cam = camera as THREE.PerspectiveCamera;
    const W = Math.max(1, size.width);
    const H = Math.max(1, size.height);
    const ease = Math.min(1, delta * 6);
    insets.current.top += (clamp(v.insetTop, 0, H * 0.8) - insets.current.top) * ease;
    insets.current.bottom += (clamp(v.insetBottom, 0, H * 0.8) - insets.current.bottom) * ease;
    const free = Math.max(H * 0.15, H - insets.current.top - insets.current.bottom);
    const freeCenter = insets.current.top + free / 2;
    // Render a taller virtual image centred on the free band (see setViewOffset).
    const virtualH = 2 * Math.max(freeCenter, H - freeCenter);
    const portrait = W / free < 0.8;

    // On a tall screen the default view looks along the board so it fills the height.
    const defaultAz = portrait ? -Math.PI / 2 : 0;
    const defaultEl = THREE.MathUtils.degToRad(portrait ? 62 : 50);
    const idle = Date.now() - v.lastInteraction > 4000;
    const az = (v.azimuth ?? defaultAz) + (idle ? Math.sin(clock.elapsedTime * 0.25) * 0.06 : 0);
    const el = v.elevation ?? defaultEl;
    v.shownAzimuth = v.azimuth ?? defaultAz;
    v.shownElevation = el;
    const zoom = v.zoom ?? (W / free >= 1 ? DEFAULT_ZOOM_WIDE : DEFAULT_ZOOM_TALL);
    v.shownZoom = zoom;

    // Distance at which the table exactly fits the free band, for these angles.
    probe.fov = cam.fov;
    probe.aspect = W / virtualH;
    const limitX = 0.94;
    const limitY = 0.94 * (free / virtualH);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    let fit = dist.current / Math.max(zoom, 0.01);
    for (let i = 0; i < 4; i++) {
      probe.position.copy(bounds.center).addScaledVector(dir, fit);
      probe.lookAt(bounds.center);
      probe.updateMatrixWorld();
      probe.updateProjectionMatrix();
      let reach = 0;
      for (const c of bounds.corners) {
        const p = c.clone().project(probe);
        reach = Math.max(reach, Math.abs(p.x) / limitX, Math.abs(p.y) / limitY);
      }
      fit *= reach;
    }
    dist.current += (fit * zoom - dist.current) * ease;

    cam.aspect = W / virtualH;
    cam.setViewOffset(W, virtualH, 0, virtualH / 2 - freeCenter, W, H);
    cam.position.copy(bounds.center).addScaledVector(dir, dist.current);
    cam.lookAt(bounds.center);
    cam.near = 0.1;
    cam.far = dist.current * 4 + layout.width * 12;
    cam.updateProjectionMatrix();
  });
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
      <mesh position={[layout.logo.x, BOARD_HEIGHT + 0.004, layout.logo.z]} rotation={[-Math.PI / 2, 0, 0.12]}>
        <planeGeometry args={[layout.logo.width, layout.logo.height]} />
        <meshStandardMaterial map={logo} transparent roughness={0.6} />
      </mesh>
    </>
  );
}

/**
 * Texture-atlas cell of a square. Like the printed board, squares are numbered
 * 1–8 over and over; steal squares are red with a white ring, the start is a big
 * glowing 1 and the finish is the ✌ disc.
 */
function atlasCell(index: number, target: number, steal: boolean) {
  if (index === target) return 0;
  if (index === 0) return 63;
  const label = (index % 8) + 1;
  return steal ? 8 + label : label;
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

/** The numbers turn with the camera so they always read upright. */
function Discs({
  layout,
  texture,
  view,
  stealSquares,
}: {
  layout: BoardLayout;
  texture: THREE.Texture;
  view: RefObject<OrbitView>;
  stealSquares: readonly number[];
}) {
  const faces = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const az = view.current?.shownAzimuth ?? 0;
    for (const f of faces.current) if (f) f.rotation.y = az;
  });
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
        const steal = stealSquares.includes(i);
        const color = steal ? RED : '#ffffff';
        return { ...sq, radius, angle, color, face: atlasPlane(atlasCell(i, target, steal), radius * 0.98) };
      }),
    [layout, target, stealSquares],
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
            <meshStandardMaterial color={d.color} roughness={0.4} />
          </mesh>
          <mesh
            position={[Math.sin(d.angle) * d.radius * 0.85, DISC_HEIGHT / 2, Math.cos(d.angle) * d.radius * 0.85]}
            rotation-y={d.angle + Math.PI / 4}
            castShadow
          >
            <boxGeometry args={[d.radius * 0.5, DISC_HEIGHT, d.radius * 0.5]} />
            <meshStandardMaterial color={d.color} roughness={0.4} />
          </mesh>
          <mesh
            ref={(m) => {
              faces.current[i] = m;
            }}
            geometry={d.face}
            position-y={DISC_HEIGHT + 0.002}
          >
            <meshStandardMaterial map={texture} transparent alphaTest={0.3} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const PAWN_PROFILE = [
  [0, 0],
  [0.25, 0],
  [0.26, 0.035],
  [0.21, 0.08],
  [0.15, 0.13],
  [0.115, 0.22],
  [0.1, 0.4],
  [0.135, 0.44],
  [0.14, 0.48],
  [0.09, 0.51],
  [0, 0.52],
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
      const before = progress.current;
      const up = to > before;
      progress.current = up ? Math.min(to, before + step) : Math.max(to, before - step);
      // A wooden "tok" each time the pawn lands on a square.
      const landed = up
        ? Math.floor(progress.current) !== Math.floor(before)
        : Math.ceil(progress.current) !== Math.ceil(before);
      if (landed) playSound('hop', 0.8);
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
  [0.22, 0],
  [0.25, 0.18],
  [0.2, 0.36],
  [0.07, 0.5],
  [0.2, 0.64],
  [0.25, 0.82],
  [0.22, 1.0],
].map(([x, y]) => new THREE.Vector2(x, y));

/** Sand filling the top bulb, measured up from the neck. */
const TOP_SAND = [
  [0, 0],
  [0.05, 0],
  [0.175, 0.14],
  [0.225, 0.32],
  [0.2, 0.4],
  [0, 0.4],
].map(([x, y]) => new THREE.Vector2(x, y));

function propPositions(layout: BoardLayout) {
  const baseX = layout.width / 2 - 1.7;
  const baseZ = -layout.depth / 2 - 1.35;
  const decks: [number, number, number][] = [
    [baseX - 0.55, baseZ - 0.35, 0.18],
    [baseX + 0.6, baseZ - 0.55, -0.1],
    [baseX - 0.35, baseZ + 0.75, 0.05],
    [baseX + 0.85, baseZ + 0.55, 0.22],
  ];
  const [x, z] = decks[2];
  return {
    decks,
    drawFrom: new THREE.Vector3(x, 0.42, z),
    timer: new THREE.Vector3(baseX - 2.3, 0, baseZ + 0.1),
  };
}

function Decks({ decks, cardTexture }: { decks: [number, number, number][]; cardTexture: THREE.Texture }) {
  const side = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.7 }), []);
  const top = useMemo(() => new THREE.MeshStandardMaterial({ map: cardTexture, roughness: 0.45 }), [cardTexture]);
  const materials = [side, side, top, side, side, side];
  return (
    <>
      {decks.map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.2, z]} rotation-y={r} material={materials} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.4, 1.33]} />
        </mesh>
      ))}
    </>
  );
}

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/**
 * Sand timer = turn clock. When a turn starts it flips over (the sand that had
 * fallen is now on top), then the sand runs from the top bulb to the bottom.
 */
function SandTimer({ position, sand }: { position: THREE.Vector3; sand: RefObject<SandState> }) {
  const pivot = useRef<THREE.Group>(null);
  const topSand = useRef<THREE.Mesh>(null);
  const pile = useRef<THREE.Mesh>(null);
  const stream = useRef<THREE.Mesh>(null);
  const turn = useRef(sand.current?.turnId ?? 0);
  const flipStart = useRef<number | null>(null);

  const glass = useMemo(() => new THREE.LatheGeometry(TIMER_GLASS, 40), []);
  const topGeometry = useMemo(() => new THREE.LatheGeometry(TOP_SAND, 32), []);
  const pileGeometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.21, 0.3, 32);
    g.translate(0, 0.15, 0);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const s = sand.current;
    if (!s || !pivot.current || !topSand.current || !pile.current || !stream.current) return;
    const t = clock.elapsedTime;
    if (s.turnId !== turn.current) {
      turn.current = s.turnId;
      flipStart.current = t;
    }
    const flipK = flipStart.current === null ? 1 : (t - flipStart.current) / (TIMER_FLIP_MS / 1000);
    const flipping = flipK < 1;
    let top: number;
    let bottom: number;
    if (flipping) {
      // Rotate end over end, lifted off the table; the fallen sand turns with the glass.
      const k = easeInOut(Math.max(0, flipK));
      pivot.current.rotation.z = Math.PI * k;
      pivot.current.position.y = 0.58 + Math.sin(k * Math.PI) * 0.5;
      top = 0;
      bottom = 1;
    } else {
      pivot.current.rotation.z = 0;
      pivot.current.position.y = 0.58;
      const p = s.turnId === 0 ? 1 : clamp(s.progress, 0, 1);
      top = 1 - p;
      bottom = p;
    }
    topSand.current.visible = top > 0.002;
    topSand.current.scale.set(0.55 + 0.45 * top, Math.max(top, 0.001), 0.55 + 0.45 * top);
    pile.current.visible = bottom > 0.002;
    pile.current.scale.set(0.45 + 0.55 * bottom, Math.max(bottom, 0.001), 0.45 + 0.55 * bottom);
    const running = !flipping && top > 0.002 && bottom < 0.998 && s.turnId > 0;
    stream.current.visible = running;
    if (running) {
      const pileTop = 0.08 + 0.3 * bottom;
      const len = Math.max(0.02, 0.58 - pileTop);
      stream.current.scale.y = len;
      stream.current.position.y = pileTop + len / 2;
    }
  });

  return (
    <group position={position} scale={2.2}>
      {/* Pivot at mid-height so the flip turns the timer around its centre. */}
      <group ref={pivot} position-y={0.58}>
        <group position-y={-0.58}>
          <mesh position-y={0.04} castShadow>
            <cylinderGeometry args={[0.3, 0.32, 0.08, 32]} />
            <meshStandardMaterial color={RED} roughness={0.35} />
          </mesh>
          <mesh ref={pile} geometry={pileGeometry} position-y={0.08}>
            <meshStandardMaterial color={SAND} roughness={0.95} />
          </mesh>
          <mesh ref={topSand} geometry={topGeometry} position-y={0.58}>
            <meshStandardMaterial color={SAND} roughness={0.95} />
          </mesh>
          <mesh ref={stream}>
            <cylinderGeometry args={[0.018, 0.018, 1, 8]} />
            <meshStandardMaterial color={SAND} roughness={0.95} />
          </mesh>
          <mesh geometry={glass} position-y={0.08} castShadow>
            <meshStandardMaterial
              color="#ffffff"
              transparent
              opacity={0.22}
              roughness={0.05}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Open ring on top, so from the usual high camera you can look down into the top bulb. */}
          <mesh position-y={1.12} rotation-x={Math.PI / 2} castShadow>
            <torusGeometry args={[0.26, 0.05, 16, 40]} />
            <meshStandardMaterial color={RED} roughness={0.35} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** A card lifts off the deck and flies up towards the viewer; the readable card then appears on screen. */
function CardFlight({
  from,
  cardsDrawn,
  texture,
}: {
  from: THREE.Vector3;
  cardsDrawn: number;
  texture: THREE.Texture;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const seen = useRef(cardsDrawn);
  const startAt = useRef<number | null>(null);
  const { camera } = useThree();
  const flat = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), []);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    if (cardsDrawn !== seen.current) {
      seen.current = cardsDrawn;
      startAt.current = t;
    }
    const k = startAt.current === null ? 1 : (t - startAt.current) / CARD_FLIGHT;
    m.visible = k < 1;
    if (!m.visible) return;
    const e = 1 - (1 - k) ** 3;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const to = camera.position.clone().addScaledVector(dir, 3);
    m.position.lerpVectors(from, to, e);
    m.position.y += Math.sin(k * Math.PI) * 1.2;
    m.quaternion.slerpQuaternions(flat, camera.quaternion, e);
    m.rotateZ((1 - e) * 0.6);
  });

  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[0.95, 1.33]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.4} />
    </mesh>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: STAGE, overflow: 'hidden' },
  // Web: the browser must not pan or zoom the page for drags / pinches on the board.
  touchNone: Platform.OS === 'web' ? ({ touchAction: 'none' } as ViewStyle) : {},
});
