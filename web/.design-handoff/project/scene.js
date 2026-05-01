import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ---------------------------------------------------------------------------
// Scene state — exposed on window so the Tweaks panel can drive it.
// ---------------------------------------------------------------------------
const state = {
  tilt: 22,            // degrees, lean of the panel back
  yaw: -28,            // degrees, rotation around Y
  rows: 3,
  cols: 4,
  cellsPerModule: 4,   // 4x4 cells per module, like the reference
  frameColor: '#f3f3f3',
  cellColor: '#0e1a2b',
  envIntensity: 1.0,
  sunIntensity: 1.6,
  sunAngle: 55,        // degrees from horizon
  sunAzimuth: -40,     // degrees around scene
  autoRotate: false,
  showShadow: true,
  background: 'studio' // 'studio' | 'sky' | 'transparent'
};
window.__panelState = state;

// ---------------------------------------------------------------------------
// Three.js bootstrap
// ---------------------------------------------------------------------------
const stage = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = null;
window.__scene = scene;

const camera = new THREE.PerspectiveCamera(35, stage.clientWidth / stage.clientHeight, 0.1, 100);
camera.position.set(4.2, 2.6, 5.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.5;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0.9, 0);

// ---------------------------------------------------------------------------
// Procedural environment — soft studio gradient via PMREM
// ---------------------------------------------------------------------------
const pmrem = new THREE.PMREMGenerator(renderer);

function buildStudioEnv() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  // Smooth horizon gradient — no concentrated highlights that would create
  // a bright streak reflection on the glass.
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#cdd5dd');
  g.addColorStop(0.5, '#dde1e5');
  g.addColorStop(1.0, '#a8a8a8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  return env;
}

const studioEnv = buildStudioEnv();
scene.environment = studioEnv;

// ---------------------------------------------------------------------------
// Ground (catches the contact shadow)
// ---------------------------------------------------------------------------
const groundMat = new THREE.ShadowMaterial({ opacity: 0.22 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff4e0, state.sunIntensity);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 30;
sun.shadow.camera.left = -6;
sun.shadow.camera.right = 6;
sun.shadow.camera.top = 6;
sun.shadow.camera.bottom = -6;
sun.shadow.bias = -0.0004;
sun.shadow.radius = 5;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xbfd4ff, 0.35);
fill.position.set(-4, 3, -2);
scene.add(fill);

function placeSun() {
  const angle = THREE.MathUtils.degToRad(state.sunAngle);
  const azim = THREE.MathUtils.degToRad(state.sunAzimuth);
  const r = 8;
  sun.position.set(
    Math.cos(angle) * Math.sin(azim) * r,
    Math.sin(angle) * r,
    Math.cos(angle) * Math.cos(azim) * r
  );
  sun.target.position.set(0, 1, 0);
  sun.intensity = state.sunIntensity;
}
placeSun();

// ---------------------------------------------------------------------------
// Materials (kept module-scoped so we can mutate them on tweak changes)
// ---------------------------------------------------------------------------
const frameMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(state.frameColor),
  roughness: 0.45,
  metalness: 0.0,
  clearcoat: 0.4,
  clearcoatRoughness: 0.4,
  envMapIntensity: state.envIntensity
});

const poleMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color('#dadada'),
  roughness: 0.55,
  metalness: 0.05,
  clearcoat: 0.2,
  clearcoatRoughness: 0.6,
  envMapIntensity: state.envIntensity
});

// Procedural cell texture: a solid base + subtle inner stripes,
// drawn per-cell so each square reads like a real PV cell.
function buildCellTexture(baseHex) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // Base
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle vertical bus bars (lighter)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1.5;
  for (let x = size * 0.28; x < size; x += size * 0.34) {
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, size - 6);
    ctx.stroke();
  }

  // Fine horizontal grid lines (thinner, very subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let y = 18; y < size; y += 14) {
    ctx.beginPath();
    ctx.moveTo(6, y);
    ctx.lineTo(size - 6, y);
    ctx.stroke();
  }

  // Slight gradient sheen
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Soft corner darkening
  const v = ctx.createRadialGradient(size/2, size/2, size*0.35, size/2, size/2, size*0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

let cellMat = new THREE.MeshPhysicalMaterial({
  map: buildCellTexture(state.cellColor),
  color: 0xffffff,
  roughness: 0.42,
  metalness: 0.05,
  clearcoat: 0.5,
  clearcoatRoughness: 0.3,
  reflectivity: 0.35,
  envMapIntensity: state.envIntensity
});

// ---------------------------------------------------------------------------
// Build the panel (frame + cells + pole)
// ---------------------------------------------------------------------------
let panelGroup = null;

function disposeGroup(g) {
  g.traverse(o => {
    if (o.isMesh) {
      o.geometry?.dispose();
    }
  });
  scene.remove(g);
}

function buildPanel() {
  if (panelGroup) disposeGroup(panelGroup);
  panelGroup = new THREE.Group(); // world-space root: pole here, tilt-group child

  // Sizing — keep aspect close to the reference (4 modules wide, 3 tall)
  const moduleSize = 0.62;             // each module square edge
  const panelW = state.cols * moduleSize;
  const panelH = state.rows * moduleSize;
  const frameThickness = 0.085;
  const borderW = 0.07;

  // Pivot height — where the panel back meets the top of the mast.
  // Panel sits ABOVE this, so its bottom edge is exactly at pivotY.
  const groundClearance = 0.55;
  const pivotY = groundClearance;

  // panelTilt: contains the panel only; rotates around X at pivotY.
  // The panel center is offset UP by panelH/2 inside the tilt group, so the
  // tilt rotation pivots around the panel's BOTTOM-BACK edge — exactly where
  // the mount meets the mast in the reference image.
  const panelTilt = new THREE.Group();
  panelTilt.position.y = pivotY;
  panelGroup.add(panelTilt);

  // Where the panel sits relative to the mast axis (forward in z, up in y).
  // Forward offset must be large enough that the mast (radius 0.075) clears
  // the panel back face from any tilt angle.
  const mastRadius = 0.078;
  const panelForwardOffset = frameThickness / 2 + mastRadius + 0.02;
  const panelUpOffset = panelH / 2;

  // Outer frame (rounded box)
  const frameGeo = new RoundedBoxGeometry(
    panelW + borderW * 2,
    panelH + borderW * 2,
    frameThickness,
    4,
    0.045
  );
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.castShadow = true;
  frame.receiveShadow = true;
  frame.position.set(0, panelUpOffset, panelForwardOffset);
  panelTilt.add(frame);

  // Cell field — one Plane per cell, slightly raised above the frame surface
  const cellsX = state.cols * state.cellsPerModule;
  const cellsY = state.rows * state.cellsPerModule;
  const cellW = panelW / cellsX;
  const cellH = panelH / cellsY;
  const cellPad = cellW * 0.06; // gap between cells (white grout)

  const cellGeo = new THREE.PlaneGeometry(cellW - cellPad, cellH - cellPad);
  const cellsField = new THREE.InstancedMesh(cellGeo, cellMat, cellsX * cellsY);
  cellsField.castShadow = false;
  cellsField.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let i = 0;
  const startX = -panelW / 2 + cellW / 2;
  const startY = -panelH / 2 + cellH / 2;
  for (let y = 0; y < cellsY; y++) {
    for (let x = 0; x < cellsX; x++) {
      dummy.position.set(
        startX + x * cellW,
        panelUpOffset + startY + y * cellH,
        panelForwardOffset + frameThickness / 2 + 0.002
      );
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      cellsField.setMatrixAt(i++, dummy.matrix);
    }
  }
  cellsField.instanceMatrix.needsUpdate = true;
  panelTilt.add(cellsField);

  // Module separators removed — the cell grid alone reads cleanly without
  // stark white grid lines that would dominate the panel face.

  // Tilt the panel-only group around the pivot (panel back edge area).
  panelTilt.rotation.x = THREE.MathUtils.degToRad(-state.tilt);

  // ---- Pole assembly (WORLD-SPACE: child of panelGroup root, NOT of panelTilt) ----
  const poleGroup = new THREE.Group();

  // Rectangular base block on the ground
  const baseH = 0.14;
  const baseGeo = new RoundedBoxGeometry(0.46, baseH, 0.26, 3, 0.028);
  const base = new THREE.Mesh(baseGeo, poleMat);
  base.position.y = baseH / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  poleGroup.add(base);

  // Cylindrical mast — from base top up to pivot point (panel bottom)
  const mastTop = pivotY;
  const mastH = Math.max(0.1, mastTop - baseH);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(mastRadius, mastRadius * 1.1, mastH, 24),
    poleMat
  );
  mast.position.y = baseH + mastH / 2;
  mast.castShadow = true;
  mast.receiveShadow = true;
  poleGroup.add(mast);



  panelGroup.add(poleGroup);

  // Yaw the whole assembly
  panelGroup.rotation.y = THREE.MathUtils.degToRad(state.yaw);

  // Stash refs for cheap updates
  panelGroup.userData.panelTilt = panelTilt;

  // Mount group at origin
  const root = new THREE.Group();
  root.add(panelGroup);
  scene.add(root);
  panelGroup.userData.root = root;

  return panelGroup;
}

buildPanel();

// ---------------------------------------------------------------------------
// Tweak handlers — called by the React panel via window.__updatePanel
// ---------------------------------------------------------------------------
window.__updatePanel = (patch) => {
  const needsRebuild = ['rows', 'cols', 'cellsPerModule', 'frameColor', 'cellColor']
    .some(k => k in patch);

  Object.assign(state, patch);

  // Material updates that don't need a rebuild
  if ('envIntensity' in patch) {
    frameMat.envMapIntensity = state.envIntensity;
    cellMat.envMapIntensity = state.envIntensity;
    poleMat.envMapIntensity = state.envIntensity;
  }
  if ('frameColor' in patch && !needsRebuild) {
    frameMat.color.set(state.frameColor);
    poleMat.color.set('#dadada');
  }
  if ('cellColor' in patch) {
    cellMat.map?.dispose();
    cellMat.map = buildCellTexture(state.cellColor);
    cellMat.needsUpdate = true;
  }
  if ('sunIntensity' in patch || 'sunAngle' in patch || 'sunAzimuth' in patch) {
    placeSun();
  }
  if ('showShadow' in patch) {
    ground.visible = state.showShadow;
  }
  if ('autoRotate' in patch) {
    controls.autoRotate = state.autoRotate;
    controls.autoRotateSpeed = 0.8;
  }
  if ('tilt' in patch || 'yaw' in patch) {
    if (panelGroup) {
      const panelTilt = panelGroup.userData.panelTilt;
      if (panelTilt) {
        panelTilt.rotation.x = THREE.MathUtils.degToRad(-state.tilt);
      }
      panelGroup.rotation.y = THREE.MathUtils.degToRad(state.yaw);
    }
  }
  if (needsRebuild) {
    // remove old root
    const old = panelGroup?.userData.root;
    if (old) {
      old.traverse(o => o.geometry?.dispose?.());
      scene.remove(old);
    }
    cellMat.map?.dispose();
    cellMat = new THREE.MeshPhysicalMaterial({
      map: buildCellTexture(state.cellColor),
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.05,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      reflectivity: 0.35,
      envMapIntensity: state.envIntensity
    });
    frameMat.color.set(state.frameColor);
    buildPanel();
  }
};

// ---------------------------------------------------------------------------
// Resize + render loop
// ---------------------------------------------------------------------------
function onResize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

const fpsEl = document.getElementById('fpsVal');
const triEl = document.getElementById('triVal');
let lastTime = performance.now();
let frames = 0;
let fpsAccum = 0;

function tick() {
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;
  frames++;
  fpsAccum += dt;
  if (fpsAccum > 500) {
    const fps = Math.round(1000 / (fpsAccum / frames));
    fpsEl.textContent = fps;
    frames = 0;
    fpsAccum = 0;
    let tris = 0;
    scene.traverse(o => {
      if (o.isMesh && o.geometry?.index) {
        const inst = o.isInstancedMesh ? o.count : 1;
        tris += (o.geometry.index.count / 3) * inst;
      } else if (o.isMesh && o.geometry?.attributes?.position) {
        const inst = o.isInstancedMesh ? o.count : 1;
        tris += (o.geometry.attributes.position.count / 3) * inst;
      }
    });
    triEl.textContent = tris.toLocaleString('fr-FR');
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
