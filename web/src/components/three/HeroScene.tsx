import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Scroll-driven hero scene : black noise → solar panel
// Reads progress (0..1) from window.__heroBus.progress, driven by Hero.astro's ScrollTrigger.

type HeroBus = { progress: number };

export default function HeroScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

    // PBR env (RoomEnvironment gives nice neutral reflections on the panel)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // 3-point lighting
    const key = new THREE.DirectionalLight(0xfff5e0, 2.8);
    key.position.set(7, 9, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x90b4ff, 0.9);
    fill.position.set(-6, 4, -3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe6b8, 1.4);
    rim.position.set(-3, 2, -8);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // ---------- Solar panel cell grid (12x6 = 72 cells) ----------
    const COLS = 12;
    const ROWS = 6;
    const TOTAL = COLS * ROWS;

    const PANEL_W = 5.4;
    const PANEL_H = 2.9;
    const cellW = PANEL_W / COLS;
    const cellH = PANEL_H / ROWS;
    const cellGap = 0.025;
    const cellSizeX = cellW - cellGap;
    const cellSizeZ = cellH - cellGap;
    const cellThickness = 0.06;

    // Procedural cell texture (mono cell)
    function makeCellTex(): THREE.CanvasTexture {
      const s = 512;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const x = c.getContext('2d')!;

      const grad = x.createRadialGradient(s * 0.5, s * 0.5, s * 0.1, s * 0.5, s * 0.5, s * 0.75);
      grad.addColorStop(0, '#1c2e5e');
      grad.addColorStop(0.5, '#152448');
      grad.addColorStop(1, '#0a1530');
      x.fillStyle = grad;
      x.fillRect(0, 0, s, s);

      // crystalline iridescence blooms
      for (let i = 0; i < 240; i++) {
        const cx = Math.random() * s;
        const cy = Math.random() * s;
        const r = 30 + Math.random() * 120;
        const g2 = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        const hue = 215 + Math.random() * 40;
        g2.addColorStop(0, `hsla(${hue}, 60%, 45%, ${0.04 + Math.random() * 0.06})`);
        g2.addColorStop(1, 'hsla(220, 60%, 20%, 0)');
        x.fillStyle = g2;
        x.beginPath();
        x.arc(cx, cy, r, 0, Math.PI * 2);
        x.fill();
      }

      // diagonal anisotropic streaks
      x.save();
      x.globalCompositeOperation = 'screen';
      for (let i = 0; i < 60; i++) {
        x.strokeStyle = `rgba(80,110,180,${0.02 + Math.random() * 0.04})`;
        x.lineWidth = 0.5 + Math.random() * 1.5;
        x.beginPath();
        const y = Math.random() * s;
        x.moveTo(0, y);
        x.lineTo(s, y + (Math.random() - 0.5) * 40);
        x.stroke();
      }
      x.restore();

      // mono corner chamfers
      const ch = s * 0.085;
      x.fillStyle = '#03060f';
      ([
        [0, 0, 1, 1],
        [s, 0, -1, 1],
        [0, s, 1, -1],
        [s, s, -1, -1],
      ] as Array<[number, number, number, number]>).forEach(([cx, cy, sx, sy]) => {
        x.beginPath();
        x.moveTo(cx, cy);
        x.lineTo(cx + ch * sx, cy);
        x.lineTo(cx, cy + ch * sy);
        x.closePath();
        x.fill();
      });

      // 60 thin silver fingers (vertical)
      const fingerCount = 60;
      for (let i = 1; i < fingerCount; i++) {
        const px = (i / fingerCount) * s;
        x.fillStyle = 'rgba(210, 218, 232, 0.42)';
        x.fillRect(px - 0.5, ch + 4, 1, s - 2 * ch - 8);
        x.fillStyle = 'rgba(255, 255, 255, 0.18)';
        x.fillRect(px - 0.25, ch + 4, 0.5, s - 2 * ch - 8);
      }

      // 3 horizontal busbars
      const busbars = [s * 0.22, s * 0.5, s * 0.78];
      busbars.forEach((by) => {
        const bg = x.createLinearGradient(0, by - 3, 0, by + 3);
        bg.addColorStop(0, 'rgba(180,188,202,0.95)');
        bg.addColorStop(0.5, 'rgba(245,248,255,0.98)');
        bg.addColorStop(1, 'rgba(160,168,182,0.95)');
        x.fillStyle = bg;
        x.fillRect(8, by - 3, s - 16, 6);
        x.fillStyle = 'rgba(255,255,255,0.5)';
        for (let d = 0; d < 14; d++) {
          const dx = 16 + (d / 13) * (s - 32);
          x.beginPath();
          x.arc(dx, by, 1.2, 0, Math.PI * 2);
          x.fill();
        }
      });

      // dark frame line around the cell
      x.strokeStyle = 'rgba(0,0,0,0.6)';
      x.lineWidth = 4;
      x.strokeRect(2, 2, s - 4, s - 4);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      return tex;
    }

    function makeCellRoughness(): THREE.CanvasTexture {
      const s = 256;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const x = c.getContext('2d')!;
      x.fillStyle = '#5a5a5a';
      x.fillRect(0, 0, s, s);
      [s * 0.22, s * 0.5, s * 0.78].forEach((by) => {
        x.fillStyle = '#1a1a1a';
        x.fillRect(4, by - 3, s - 8, 6);
      });
      for (let i = 0; i < 1500; i++) {
        const v = 60 + Math.random() * 80;
        x.fillStyle = `rgba(${v},${v},${v},0.5)`;
        x.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 8;
      return tex;
    }

    const cellTex = makeCellTex();
    const cellRoughTex = makeCellRoughness();

    const cellMat = new THREE.MeshPhysicalMaterial({
      map: cellTex,
      roughnessMap: cellRoughTex,
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.25,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.7,
      envMapIntensity: 1.4,
      iridescence: 0.35,
      iridescenceIOR: 1.45,
      sheen: 0.2,
      sheenColor: new THREE.Color(0x4060a0),
    });

    const cellGeo = new THREE.BoxGeometry(cellSizeX, cellThickness, cellSizeZ, 1, 1, 1);
    const cells = new THREE.InstancedMesh(cellGeo, cellMat, TOTAL);
    cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cells.castShadow = true;
    scene.add(cells);

    // Backsheet
    const backsheet = new THREE.Mesh(
      new THREE.BoxGeometry(PANEL_W - 0.04, cellThickness * 0.6, PANEL_H - 0.04),
      new THREE.MeshStandardMaterial({ color: 0xeaecef, roughness: 0.85, metalness: 0 })
    );
    backsheet.position.y = -cellThickness * 0.55;

    // Per-cell data
    type CellDatum = {
      target: THREE.Vector3;
      start: THREE.Vector3;
      delay: number;
      rotStart: THREE.Euler;
    };
    const cellData: CellDatum[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const tx = -PANEL_W / 2 + cellW / 2 + col * cellW;
      const ty = 0;
      const tz = -PANEL_H / 2 + cellH / 2 + row * cellH;

      const r = 14 + Math.random() * 18;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sx = r * Math.sin(ph) * Math.cos(th);
      const sy = r * Math.cos(ph) * 0.6;
      const sz = r * Math.sin(ph) * Math.sin(th);

      cellData.push({
        target: new THREE.Vector3(tx, ty, tz),
        start: new THREE.Vector3(sx, sy, sz),
        delay: Math.random() * 0.35,
        rotStart: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
      });
    }

    // Frame (extruded rounded ring)
    const frameGroup = new THREE.Group();
    const aluMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e5ea,
      roughness: 0.22,
      metalness: 0.95,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.3,
    });

    {
      const outerW = PANEL_W + 0.18;
      const outerH = PANEL_H + 0.18;
      const innerW = PANEL_W - 0.02;
      const innerH = PANEL_H - 0.02;
      const r = 0.05;

      const shape = new THREE.Shape();
      shape.moveTo(-outerW / 2 + r, -outerH / 2);
      shape.lineTo(outerW / 2 - r, -outerH / 2);
      shape.quadraticCurveTo(outerW / 2, -outerH / 2, outerW / 2, -outerH / 2 + r);
      shape.lineTo(outerW / 2, outerH / 2 - r);
      shape.quadraticCurveTo(outerW / 2, outerH / 2, outerW / 2 - r, outerH / 2);
      shape.lineTo(-outerW / 2 + r, outerH / 2);
      shape.quadraticCurveTo(-outerW / 2, outerH / 2, -outerW / 2, outerH / 2 - r);
      shape.lineTo(-outerW / 2, -outerH / 2 + r);
      shape.quadraticCurveTo(-outerW / 2, -outerH / 2, -outerW / 2 + r, -outerH / 2);

      const hole = new THREE.Path();
      hole.moveTo(-innerW / 2, -innerH / 2);
      hole.lineTo(-innerW / 2, innerH / 2);
      hole.lineTo(innerW / 2, innerH / 2);
      hole.lineTo(innerW / 2, -innerH / 2);
      hole.lineTo(-innerW / 2, -innerH / 2);
      shape.holes.push(hole);

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: cellThickness + 0.1,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.015,
        bevelSegments: 3,
        curveSegments: 8,
      });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, -cellThickness / 2 - 0.05, 0);

      const frameMesh = new THREE.Mesh(geo, aluMat);
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      frameGroup.add(frameMesh);
    }
    frameGroup.scale.set(0.001, 0.001, 0.001);
    scene.add(frameGroup);

    // Panel parent (pas de junction box : le boîtier est censé être à l'arrière du panneau,
    // mais avec l'inclinaison à 86° on le voyait dépasser au centre-droit)
    const panelRoot = new THREE.Group();
    panelRoot.add(cells);
    panelRoot.add(backsheet);
    panelRoot.add(frameGroup);
    scene.add(panelRoot);

    // Debris fragments (smaller cells floating)
    const DEBRIS_COUNT = 90;
    const debrisGeo = new THREE.BoxGeometry(cellSizeX * 0.5, cellThickness * 0.7, cellSizeZ * 0.5);
    const debris = new THREE.InstancedMesh(debrisGeo, cellMat, DEBRIS_COUNT);
    debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(debris);

    type DebrisDatum = {
      start: THREE.Vector3;
      mid: THREE.Vector3;
      speed: number;
      spin: number;
      phase: number;
      size: number;
      rotStart: THREE.Euler;
    };
    const debrisData: DebrisDatum[] = [];
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const r1 = 12 + Math.random() * 18;
      const r2 = 4 + Math.random() * 6;
      const a1 = Math.random() * Math.PI * 2;
      const a2 = Math.random() * Math.PI * 2;
      const ph1 = Math.acos(2 * Math.random() - 1);
      const ph2 = Math.acos(2 * Math.random() - 1);
      debrisData.push({
        start: new THREE.Vector3(
          r1 * Math.sin(ph1) * Math.cos(a1),
          r1 * Math.cos(ph1) * 0.7,
          r1 * Math.sin(ph1) * Math.sin(a1)
        ),
        mid: new THREE.Vector3(
          r2 * Math.sin(ph2) * Math.cos(a2),
          r2 * Math.cos(ph2) * 0.7,
          r2 * Math.sin(ph2) * Math.sin(a2)
        ),
        speed: 0.6 + Math.random() * 1.4,
        spin: 0.5 + Math.random() * 1.5,
        phase: Math.random(),
        size: 0.5 + Math.random() * 1.2,
        rotStart: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
      });
    }

    // Resize
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Camera positioning (responsive)
    function setCameraForViewport() {
      const portrait = window.innerWidth < 900;
      camera.position.set(0, portrait ? 1.6 : 1.0, portrait ? 16 : 12.5);
      camera.lookAt(0, portrait ? 1.4 : 0, 0);
    }
    setCameraForViewport();
    window.addEventListener('resize', setCameraForViewport);

    // Final orientation
    const FINAL_TILT_X = THREE.MathUtils.degToRad(90 - 4);
    const FINAL_TILT_Y = THREE.MathUtils.degToRad(3);
    function getFinalPos(): THREE.Vector3 {
      const portrait = window.innerWidth < 900;
      return portrait
        ? new THREE.Vector3(0, 1.6, 0)
        : new THREE.Vector3(2.4, 0.0, 0);
    }
    let FINAL_POS = getFinalPos();
    const onResize = () => {
      FINAL_POS = getFinalPos();
    };
    window.addEventListener('resize', onResize);

    const ease = {
      out3: (t: number) => 1 - Math.pow(1 - t, 3),
    };

    // Init bus
    const win = window as unknown as { __heroBus?: HeroBus };
    if (!win.__heroBus) win.__heroBus = { progress: 0 };

    const dummy = new THREE.Object3D();
    const tmpVec = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const targetQuat = new THREE.Quaternion();
    const startQuat = new THREE.Quaternion();

    let rafId = 0;

    function loop(now: number) {
      const p = win.__heroBus?.progress ?? 0;

      // Spawn gate (panneau entier caché tant qu'on n'a pas commencé à scroller)
      const spawn = THREE.MathUtils.smoothstep(p, 0.04, 0.12);
      panelRoot.visible = spawn > 0.001;

      // Cell assembly
      const aP = THREE.MathUtils.smoothstep(p, 0.1, 0.65);
      for (let i = 0; i < TOTAL; i++) {
        const d = cellData[i];
        let local = (aP - d.delay) / (1 - d.delay);
        local = Math.max(0, Math.min(1, local));
        const e = ease.out3(local);

        tmpVec.lerpVectors(d.start, d.target, e);
        if (local < 1) {
          tmpVec.x += Math.sin((now * 0.001 + i) * 1.7) * 0.15 * (1 - e);
          tmpVec.y += Math.cos((now * 0.001 + i * 0.7) * 1.3) * 0.15 * (1 - e);
        }

        startQuat.setFromEuler(d.rotStart);
        targetQuat.identity();
        tmpQuat.copy(startQuat).slerp(targetQuat, e);

        dummy.position.copy(tmpVec);
        dummy.quaternion.copy(tmpQuat);
        const sc = (0.6 + 0.4 * e) * spawn;
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        cells.setMatrixAt(i, dummy.matrix);
      }
      cells.instanceMatrix.needsUpdate = true;

      // Debris
      const debrisP = THREE.MathUtils.smoothstep(p, 0.05, 0.55);
      const debrisFade = 1 - THREE.MathUtils.smoothstep(p, 0.45, 0.65);
      for (let i = 0; i < DEBRIS_COUNT; i++) {
        const d = debrisData[i];
        const t = (now * 0.0001 * d.speed + d.phase) % 1;
        const drift = THREE.MathUtils.smoothstep(t, 0, 1);
        tmpVec.copy(d.start).lerp(d.mid, drift);
        tmpVec.x += Math.sin(now * 0.0008 * d.speed + i) * 0.4;
        tmpVec.y += Math.cos(now * 0.0006 * d.speed + i * 1.3) * 0.4;
        tmpVec.z += Math.sin(now * 0.0005 * d.speed + i * 0.7) * 0.3;

        const rotX = d.rotStart.x + now * 0.0006 * d.spin;
        const rotY = d.rotStart.y + now * 0.0005 * d.spin;
        const rotZ = d.rotStart.z + now * 0.0004 * d.spin;
        dummy.position.copy(tmpVec);
        dummy.rotation.set(rotX, rotY, rotZ);
        const dscale = d.size * spawn * debrisFade * (0.6 + 0.4 * debrisP);
        dummy.scale.set(dscale, dscale, dscale);
        dummy.updateMatrix();
        debris.setMatrixAt(i, dummy.matrix);
      }
      debris.instanceMatrix.needsUpdate = true;

      // Panel root tilt + position
      const tiltP = THREE.MathUtils.smoothstep(p, 0.55, 0.85);
      const tx = THREE.MathUtils.lerp(0, FINAL_POS.x, tiltP);
      const ty = THREE.MathUtils.lerp(0, FINAL_POS.y, tiltP);
      const rx = THREE.MathUtils.lerp(0, FINAL_TILT_X, tiltP);
      const ry = THREE.MathUtils.lerp(0, FINAL_TILT_Y, tiltP);
      panelRoot.position.set(tx, ty, 0);
      panelRoot.rotation.set(rx, ry, 0);

      // Frame appears
      const frameP = THREE.MathUtils.smoothstep(p, 0.62, 0.85);
      const fs = THREE.MathUtils.lerp(0.001, 1, frameP);
      frameGroup.scale.set(fs, fs, fs);

      // Idle wobble once assembled
      if (p > 0.9) {
        const idle = (p - 0.9) / 0.1;
        const wobble = Math.sin(now * 0.0006) * 0.04 * idle;
        panelRoot.rotation.y = ry + wobble;
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', setCameraForViewport);
      window.removeEventListener('resize', onResize);
      cellTex.dispose();
      cellRoughTex.dispose();
      cellGeo.dispose();
      debrisGeo.dispose();
      cellMat.dispose();
      aluMat.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
