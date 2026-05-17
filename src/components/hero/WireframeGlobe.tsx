import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { isResolvedDark, subscribeToResolvedTheme } from '@/lib/theme';

interface GlobePalette {
  bg: number;
  dot: number;
  grid: number;
  line: number;
  fog: number;
}

function getPalette(dark: boolean): GlobePalette {
  return dark
    ? { bg: 0x020617, dot: 0xfb923c, grid: 0xea580c, line: 0xf97316, fog: 0x020617 }
    : { bg: 0xf1f5f9, dot: 0xc2410c, grid: 0xea580c, line: 0x9a3412, fog: 0xf1f5f9 };
}

/** Approximate land density on the unit sphere (0 = ocean, 1 = dense land). */
function landDensity(x: number, y: number, z: number): number {
  const blobs: ReadonlyArray<readonly [number, number, number, number]> = [
    [0.55, 0.35, 0.76, 0.34],
    [0.72, 0.2, 0.66, 0.28],
    [-0.15, 0.42, 0.89, 0.32],
    [-0.42, 0.18, 0.88, 0.26],
    [-0.78, 0.08, 0.62, 0.3],
    [-0.35, -0.35, 0.87, 0.24],
    [0.12, -0.55, 0.83, 0.22],
    [0.82, -0.42, 0.4, 0.2],
    [0.35, -0.72, 0.58, 0.18],
    [-0.55, -0.62, 0.58, 0.2],
    [0.55, -0.15, 0.82, 0.16],
    [-0.2, -0.15, 0.96, 0.14],
    [0.15, 0.05, -0.98, 0.22],
    [-0.35, 0.12, -0.94, 0.2],
    [0.62, 0.35, -0.7, 0.18],
    [-0.82, 0.25, -0.52, 0.16],
    [0.45, -0.55, -0.7, 0.15],
    [0.78, -0.35, 0.5, 0.14],
    [0.2, -0.82, 0.53, 0.12],
    [-0.12, -0.78, 0.61, 0.11],
  ];

  let density = 0;
  for (const [cx, cy, cz, radius] of blobs) {
    const d = Math.hypot(x - cx, y - cy, z - cz);
    density = Math.max(density, Math.exp(-(d * d) / (2 * radius * radius)));
  }
  return density;
}

function sampleSphere(
  latSteps: number,
  lonSteps: number,
): { positions: Float32Array; colors: Float32Array; gridLines: Float32Array } {
  const landPts: number[] = [];
  const landColors: number[] = [];
  const gridPts: number[] = [];
  const scratch = new THREE.Color();

  const pushLand = (x: number, y: number, z: number, strength: number) => {
    landPts.push(x * 2.15, y * 2.15, z * 2.15);
    scratch.setHex(0xfb923c).multiplyScalar(0.55 + strength * 0.45);
    landColors.push(scratch.r, scratch.g, scratch.b);
  };

  for (let li = 0; li <= latSteps; li += 1) {
    const v = li / latSteps;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let lj = 0; lj <= lonSteps; lj += 1) {
      const u = lj / lonSteps;
      const theta = u * Math.PI * 2;
      const x = sinPhi * Math.cos(theta);
      const y = cosPhi;
      const z = sinPhi * Math.sin(theta);
      const land = landDensity(x, y, z);

      const isGrid = li % 3 === 0 || lj % 4 === 0;
      if (land > 0.22) {
        pushLand(x, y, z, land);
        if (land > 0.55 && Math.random() < land * 0.35) {
          const jitter = 0.012;
          pushLand(
            x + (Math.random() - 0.5) * jitter,
            y + (Math.random() - 0.5) * jitter,
            z + (Math.random() - 0.5) * jitter,
            land,
          );
        }
      }

      if (isGrid) {
        gridPts.push(x * 2.2, y * 2.2, z * 2.2);
      }
    }
  }

  const positions = new Float32Array(landPts);
  const colors = new Float32Array(landColors);
  const gridLines = new Float32Array(gridPts);
  return { positions, colors, gridLines };
}

function buildConnectionLines(
  latSteps: number,
  lonSteps: number,
  palette: GlobePalette,
): THREE.LineSegments {
  const segments: number[] = [];
  const radius = 2.2;

  const pointAt = (li: number, lj: number) => {
    const phi = (li / latSteps) * Math.PI;
    const theta = (lj / lonSteps) * Math.PI * 2;
    const sinPhi = Math.sin(phi);
    return {
      x: sinPhi * Math.cos(theta) * radius,
      y: Math.cos(phi) * radius,
      z: sinPhi * Math.sin(theta) * radius,
    };
  };

  for (let li = 0; li <= latSteps; li += 3) {
    for (let lj = 0; lj <= lonSteps; lj += 4) {
      const a = pointAt(li, lj);
      const b = pointAt(Math.min(latSteps, li + 3), lj);
      const c = pointAt(li, (lj + 4) % (lonSteps + 1));
      segments.push(a.x, a.y, a.z, b.x, b.y, b.z, a.x, a.y, a.z, c.x, c.y, c.z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
  const material = new THREE.LineBasicMaterial({
    color: palette.line,
    transparent: true,
    opacity: 0.12,
  });
  return new THREE.LineSegments(geometry, material);
}

function startThreeGlobe(host: HTMLDivElement) {
  let palette = getPalette(isResolvedDark());

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(palette.fog, 0.055);

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const latSteps = 72;
  const lonSteps = 144;
  const { positions, colors, gridLines } = sampleSphere(latSteps, lonSteps);

  const landGeometry = new THREE.BufferGeometry();
  landGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  landGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const landPoints = new THREE.Points(
    landGeometry,
    new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );

  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.BufferAttribute(gridLines, 3));
  const gridPoints = new THREE.Points(
    gridGeometry,
    new THREE.PointsMaterial({
      color: palette.grid,
      size: 0.022,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );

  const connections = buildConnectionLines(latSteps, lonSteps, palette);
  globeGroup.add(connections);
  globeGroup.add(gridPoints);
  globeGroup.add(landPoints);

  globeGroup.rotation.x = Math.atan(1 / Math.sqrt(2));
  globeGroup.rotation.z = 0.18;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.35, 7.2);
  camera.lookAt(0, 0, 0);

  let animation = 0;
  const render = (time: number) => {
    globeGroup.rotation.y = time * 0.00008;
    renderer.render(scene, camera);
    animation = window.requestAnimationFrame(render);
  };

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const unsubscribeTheme = subscribeToResolvedTheme((resolved) => {
    const dark = resolved === 'dark';
    palette = getPalette(dark);
    scene.fog = new THREE.FogExp2(palette.fog, 0.055);
    (gridPoints.material as THREE.PointsMaterial).color.setHex(palette.grid);
    (connections.material as THREE.LineBasicMaterial).color.setHex(palette.line);
  });

  resize();
  render(0);
  window.addEventListener('resize', resize);

  return () => {
    unsubscribeTheme();
    window.cancelAnimationFrame(animation);
    window.removeEventListener('resize', resize);
    landGeometry.dispose();
    gridGeometry.dispose();
    connections.geometry.dispose();
    (landPoints.material as THREE.Material).dispose();
    (gridPoints.material as THREE.Material).dispose();
    (connections.material as THREE.LineBasicMaterial).dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

function startCanvasGlobe(host: HTMLDivElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'absolute inset-0 h-full w-full';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  let animation = 0;
  let rotation = 0;

  const project = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    rotY: number,
  ) => {
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos;
    const tiltX = Math.atan(1 / Math.sqrt(2));
    const ty = y * Math.cos(tiltX) - rz * Math.sin(tiltX);
    const tz = y * Math.sin(tiltX) + rz * Math.cos(tiltX);
    const scale = 2.8 / (tz + 4.2);
    return {
      sx: width * 0.62 + rx * scale * width * 0.11,
      sy: height * 0.52 - ty * scale * height * 0.11,
      depth: tz,
    };
  };

  const draw = (time: number) => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dark = isResolvedDark();
    const bg = dark ? '#020617' : '#f1f5f9';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    rotation = time * 0.00008;
    const dots: Array<{ sx: number; sy: number; alpha: number; size: number }> = [];

    const latSteps = 56;
    const lonSteps = 112;
    for (let li = 0; li <= latSteps; li += 1) {
      const phi = (li / latSteps) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      for (let lj = 0; lj <= lonSteps; lj += 1) {
        const theta = (lj / lonSteps) * Math.PI * 2;
        const x = sinPhi * Math.cos(theta);
        const y = cosPhi;
        const z = sinPhi * Math.sin(theta);
        const land = landDensity(x, y, z);
        const isGrid = li % 3 === 0 || lj % 4 === 0;
        if (land <= 0.22 && !isGrid) continue;

        const { sx, sy, depth } = project(x, y, z, width, height, rotation);
        if (depth < -2) continue;
        const alpha = isGrid ? 0.18 : 0.35 + land * 0.55;
        const size = isGrid ? 0.9 : 1.1 + land * 1.4;
        dots.push({ sx, sy, alpha, size });
      }
    }

    dots.sort((a, b) => a.sy - b.sy);
    for (const dot of dots) {
      ctx.beginPath();
      ctx.fillStyle = dark ? `rgba(251, 146, 60, ${dot.alpha})` : `rgba(194, 65, 12, ${dot.alpha})`;
      ctx.arc(dot.sx, dot.sy, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }

    animation = window.requestAnimationFrame(draw);
  };

  const unsubscribeTheme = subscribeToResolvedTheme(() => undefined);

  const loop = (time: number) => {
    draw(time);
    animation = window.requestAnimationFrame(loop);
  };
  loop(0);
  window.addEventListener('resize', () => draw(performance.now()));

  return () => {
    unsubscribeTheme();
    window.cancelAnimationFrame(animation);
    window.removeEventListener('resize', () => draw(performance.now()));
    canvas.remove();
  };
}

export function WireframeGlobe() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    try {
      const probe = document.createElement('canvas');
      const supportsWebGL = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
      if (supportsWebGL) return startThreeGlobe(host);
    } catch {
      /* fall through to canvas */
    }

    return startCanvasGlobe(host);
  }, []);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 bg-slate-100 dark:bg-slate-950"
      aria-hidden="true"
      data-globe-canvas
    />
  );
}
