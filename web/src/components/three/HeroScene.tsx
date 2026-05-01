import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------------------
// Bus de scroll partagé avec Hero.astro (window.__heroBus.progress: 0 → 1)
// ---------------------------------------------------------------------------
type HeroBus = { progress: number };
function readScrollProgress(): number {
  if (typeof window === 'undefined') return 0;
  const bus = (window as unknown as { __heroBus?: HeroBus }).__heroBus;
  return bus?.progress ?? 0;
}

// ---------------------------------------------------------------------------
// Geometry from the design handoff (4 modules wide × 3 tall, 4×4 cells/module)
// ---------------------------------------------------------------------------
const COLS = 4;
const ROWS = 3;
const CELLS_PER_MODULE = 4;
const CELLS_X = COLS * CELLS_PER_MODULE; // 16
const CELLS_Y = ROWS * CELLS_PER_MODULE; // 12
const TOTAL_CELLS = CELLS_X * CELLS_Y; // 192

const MODULE_SIZE = 0.62;
const PANEL_W = COLS * MODULE_SIZE;
const PANEL_H = ROWS * MODULE_SIZE;
const FRAME_THICKNESS = 0.085;
const BORDER_W = 0.07;
const MAST_RADIUS = 0.078;
const PANEL_FORWARD_OFFSET = FRAME_THICKNESS / 2 + MAST_RADIUS + 0.02;
const PANEL_UP_OFFSET = PANEL_H / 2;
const GROUND_CLEARANCE = 0.55;
const PIVOT_Y = GROUND_CLEARANCE;
const TILT_DEG = 22;
const YAW_DEG = -28;

const FRAME_COLOR = '#f3f3f3';
const POLE_COLOR = '#dadada';
const CELL_COLOR = '#0e1a2b';

// ---------------------------------------------------------------------------
// Procedural cell texture (bus bars + sheen + corner darkening)
// ---------------------------------------------------------------------------
function buildCellTexture(baseHex: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1.5;
  for (let x = size * 0.28; x < size; x += size * 0.34) {
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, size - 6);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let y = 18; y < size; y += 14) {
    ctx.beginPath();
    ctx.moveTo(6, y);
    ctx.lineTo(size - 6, y);
    ctx.stroke();
  }

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------------------------------------------------------------------------
// Procedural studio environment (smooth gradient — no hot spots on the glass)
// ---------------------------------------------------------------------------
function StudioEnv() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0.0, '#cdd5dd');
    g.addColorStop(0.5, '#dde1e5');
    g.addColorStop(1.0, '#a8a8a8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();

    scene.environment = env;
    return () => {
      env.dispose();
      scene.environment = null;
    };
  }, [scene, gl]);
  return null;
}

// ---------------------------------------------------------------------------
// Solar panel — frame + cells (instanced, animated assembly) + pole
// ---------------------------------------------------------------------------
type CellEntry = {
  finalPos: THREE.Vector3;
  startPos: THREE.Vector3;
  delay: number;
};

function SolarPanel() {
  const groupRef = useRef<THREE.Group>(null!);
  const tiltRef = useRef<THREE.Group>(null!);
  const frameRef = useRef<THREE.Mesh>(null!);
  const cellsRef = useRef<THREE.InstancedMesh>(null!);
  const startTime = useRef<number>(0);

  const cellW = PANEL_W / CELLS_X;
  const cellH = PANEL_H / CELLS_Y;
  const cellPad = cellW * 0.06;
  const startX = -PANEL_W / 2 + cellW / 2;
  const startY = -PANEL_H / 2 + cellH / 2;

  const cellTex = useMemo(() => buildCellTexture(CELL_COLOR), []);
  useEffect(() => () => cellTex.dispose(), [cellTex]);

  const frameGeo = useMemo(
    () =>
      new RoundedBoxGeometry(
        PANEL_W + BORDER_W * 2,
        PANEL_H + BORDER_W * 2,
        FRAME_THICKNESS,
        4,
        0.045
      ),
    []
  );
  useEffect(() => () => frameGeo.dispose(), [frameGeo]);

  const cellData = useMemo<CellEntry[]>(() => {
    const data: CellEntry[] = [];
    for (let y = 0; y < CELLS_Y; y++) {
      for (let x = 0; x < CELLS_X; x++) {
        const fx = startX + x * cellW;
        const fy = PANEL_UP_OFFSET + startY + y * cellH;
        const fz = PANEL_FORWARD_OFFSET + FRAME_THICKNESS / 2 + 0.002;
        const finalPos = new THREE.Vector3(fx, fy, fz);
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 6 + 2,
          (Math.random() - 0.5) * 6 - 3
        );
        const startPos = finalPos.clone().add(offset);
        // Stagger from top-left to bottom-right with slight randomness
        const distNorm = (y / CELLS_Y) * 0.6 + (x / CELLS_X) * 0.4;
        const delay = 0.7 + distNorm * 1.4 + Math.random() * 0.25;
        data.push({ finalPos, startPos, delay });
      }
    }
    return data;
  }, [cellW, cellH, startX, startY]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    startTime.current = performance.now();

    if (frameRef.current) {
      const mat = frameRef.current.material as THREE.MeshPhysicalMaterial;
      mat.opacity = 0;
    }
    if (cellsRef.current) {
      // Initialize all cells at scale 0 at their start positions
      cellData.forEach((cell, i) => {
        dummy.position.copy(cell.startPos);
        dummy.scale.setScalar(0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        cellsRef.current.setMatrixAt(i, dummy.matrix);
      });
      cellsRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [cellData, dummy]);

  useFrame((state) => {
    if (!groupRef.current || !tiltRef.current || !cellsRef.current || !frameRef.current) return;

    const now = performance.now();
    const elapsed = (now - startTime.current) / 1000;

    // Frame fade-in (0.3s → 1.3s)
    const frameMat = frameRef.current.material as THREE.MeshPhysicalMaterial;
    if (frameMat.opacity < 1) {
      const fT = THREE.MathUtils.clamp((elapsed - 0.3) / 1.0, 0, 1);
      frameMat.opacity = 1 - Math.pow(1 - fT, 2);
    }

    // Cell assembly (per-cell delay + 1.4s travel, scale 0→1)
    cellData.forEach((cell, i) => {
      const localT = THREE.MathUtils.clamp((elapsed - cell.delay) / 1.4, 0, 1);
      const ePos = 1 - Math.pow(1 - localT, 3); // easeOutCubic
      const eScale = THREE.MathUtils.clamp(localT * 1.6, 0, 1);
      dummy.position.lerpVectors(cell.startPos, cell.finalPos, ePos);
      dummy.scale.setScalar(eScale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      cellsRef.current.setMatrixAt(i, dummy.matrix);
    });
    cellsRef.current.instanceMatrix.needsUpdate = true;

    // Idle motion after assembly (~5s) — subtle yaw oscillation + parallaxe
    const settled = THREE.MathUtils.clamp((elapsed - 4.5) / 1.5, 0, 1);
    const t = state.clock.elapsedTime;
    const progress = readScrollProgress();

    // Yaw piloté par le scroll : -28° → 0° → +35°
    const baseYaw = THREE.MathUtils.degToRad(YAW_DEG);
    const midYaw = 0;
    const endYaw = THREE.MathUtils.degToRad(35);
    const scrollYaw =
      progress < 0.5
        ? THREE.MathUtils.lerp(baseYaw, midYaw, progress / 0.5)
        : THREE.MathUtils.lerp(midYaw, endYaw, (progress - 0.5) / 0.5);

    // Tilt piloté par le scroll : -22° → -8° (panneau redressé) → -22°
    const baseTilt = THREE.MathUtils.degToRad(-TILT_DEG);
    const midTilt = THREE.MathUtils.degToRad(-8);
    const scrollTilt =
      progress < 0.5
        ? THREE.MathUtils.lerp(baseTilt, midTilt, progress / 0.5)
        : THREE.MathUtils.lerp(midTilt, baseTilt, (progress - 0.5) / 0.5);

    const targetYaw = scrollYaw + Math.sin(t * 0.18) * 0.05 + state.pointer.x * 0.12 * settled;
    const targetTilt = scrollTilt + Math.sin(t * 0.13) * 0.025 - state.pointer.y * 0.05 * settled;

    groupRef.current.rotation.y += (targetYaw - groupRef.current.rotation.y) * 0.06;
    tiltRef.current.rotation.x += (targetTilt - tiltRef.current.rotation.x) * 0.06;
  });

  const baseH = 0.14;
  const baseGeo = useMemo(() => new RoundedBoxGeometry(0.46, baseH, 0.26, 3, 0.028), []);
  useEffect(() => () => baseGeo.dispose(), [baseGeo]);
  const mastH = Math.max(0.1, PIVOT_Y - baseH);

  return (
    <group ref={groupRef} position={[1.9, 0, 0]}>
      <group ref={tiltRef} position={[0, PIVOT_Y, 0]}>
        <mesh
          ref={frameRef}
          geometry={frameGeo}
          position={[0, PANEL_UP_OFFSET, PANEL_FORWARD_OFFSET]}
        >
          <meshPhysicalMaterial
            color={FRAME_COLOR}
            roughness={0.45}
            metalness={0}
            clearcoat={0.4}
            clearcoatRoughness={0.4}
            envMapIntensity={1}
            transparent
          />
        </mesh>

        <instancedMesh ref={cellsRef} args={[undefined, undefined, TOTAL_CELLS]}>
          <planeGeometry args={[cellW - cellPad, cellH - cellPad]} />
          <meshPhysicalMaterial
            map={cellTex}
            color={0xffffff}
            roughness={0.42}
            metalness={0.05}
            clearcoat={0.5}
            clearcoatRoughness={0.3}
            reflectivity={0.35}
            envMapIntensity={1}
          />
        </instancedMesh>
      </group>

      <group>
        <mesh geometry={baseGeo} position={[0, baseH / 2, 0]}>
          <meshPhysicalMaterial
            color={POLE_COLOR}
            roughness={0.55}
            metalness={0.05}
            clearcoat={0.2}
            clearcoatRoughness={0.6}
          />
        </mesh>
        <mesh position={[0, baseH + mastH / 2, 0]}>
          <cylinderGeometry args={[MAST_RADIUS, MAST_RADIUS * 1.1, mastH, 24]} />
          <meshPhysicalMaterial
            color={POLE_COLOR}
            roughness={0.55}
            metalness={0.05}
            clearcoat={0.2}
            clearcoatRoughness={0.6}
          />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// CameraRig — dolly + lookAt pilotés par le scroll progress
// ---------------------------------------------------------------------------
const CAM_KEYS = [
  { pos: new THREE.Vector3(3.2, 2.4, 6.2), look: new THREE.Vector3(0, 1.4, 0) },
  { pos: new THREE.Vector3(0.6, 1.8, 4.0), look: new THREE.Vector3(1.9, 1.5, 0) },
  { pos: new THREE.Vector3(5.5, 4.6, 7.5), look: new THREE.Vector3(1.9, 1.4, 0) },
];

function CameraRig() {
  const camTarget = useRef(new THREE.Vector3(0, 1.4, 0));
  const camPos = useRef(CAM_KEYS[0].pos.clone());

  useFrame((state) => {
    const p = readScrollProgress();
    const seg = p < 0.5 ? { a: 0, b: 1, t: p / 0.5 } : { a: 1, b: 2, t: (p - 0.5) / 0.5 };
    const eased = seg.t * seg.t * (3 - 2 * seg.t); // smoothstep

    camPos.current.lerpVectors(CAM_KEYS[seg.a].pos, CAM_KEYS[seg.b].pos, eased);
    camTarget.current.lerpVectors(CAM_KEYS[seg.a].look, CAM_KEYS[seg.b].look, eased);

    state.camera.position.lerp(camPos.current, 0.08);
    state.camera.lookAt(camTarget.current);
  });

  return null;
}

function SunGlow() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 0.5) * 0.06;
    meshRef.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={meshRef} position={[4, 3.2, -3]}>
      <sphereGeometry args={[1.2, 32, 32]} />
      <meshBasicMaterial color="#ffb700" transparent opacity={0.18} />
    </mesh>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [3.2, 2.4, 6.2], fov: 38 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        camera.lookAt(0, 1.4, 0);
      }}
    >
      <color attach="background" args={['#05142e']} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} color="#fff4e0" />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#bfd4ff" />
      <pointLight position={[4, 3.2, -3]} intensity={3} color="#ffb700" distance={14} />
      <StudioEnv />
      <CameraRig />
      <SolarPanel />
      <SunGlow />
    </Canvas>
  );
}
