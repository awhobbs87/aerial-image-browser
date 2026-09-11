import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import landCoordinates from '@/data/globe-land.json';
import { isResolvedDark, subscribeToResolvedTheme } from '@/lib/theme';

const RADIUS = 2.15;
const INITIAL_ROTATION = (-135 * Math.PI) / 180;
const ROTATION_SPEED = (Math.PI * 2) / 180_000;
const TILT = -0.2;

function landPositions() {
  const positions = new Float32Array((landCoordinates.length / 2) * 3);
  for (let i = 0; i < landCoordinates.length; i += 2) {
    const longitude = (landCoordinates[i] * Math.PI) / 180;
    const latitude = (landCoordinates[i + 1] * Math.PI) / 180;
    const offset = (i / 2) * 3;
    positions[offset] = Math.cos(latitude) * Math.sin(longitude) * RADIUS;
    positions[offset + 1] = Math.sin(latitude) * RADIUS;
    positions[offset + 2] = Math.cos(latitude) * Math.cos(longitude) * RADIUS;
  }
  return positions;
}

interface GlobeRenderer {
  resize: () => void;
  draw: (rotation: number, dark: boolean) => void;
  dispose: () => void;
}

function createWebGLGlobe(host: HTMLDivElement, positions: Float32Array): GlobeRenderer {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  renderer.domElement.className = 'absolute inset-0 h-full w-full';
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  camera.position.z = 6.5;
  const tilt = new THREE.Group();
  tilt.rotation.x = TILT;
  tilt.rotation.z = 0.08;
  scene.add(tilt);
  const globe = new THREE.Group();
  tilt.add(globe);

  // A depth-only sphere hides rear dots, keeping continents distinct instead of transparent.
  const sphereGeometry = new THREE.SphereGeometry(RADIUS * 0.997, 64, 48);
  const sphereMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  globe.add(sphere);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      dotColor: { value: new THREE.Color() },
      dotSize: { value: 2 },
    },
    vertexShader: `
      uniform float dotSize;
      varying float facing;
      void main() {
        facing = (modelViewMatrix * vec4(normalize(position), 0.0)).z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = dotSize * (0.8 + 0.2 * max(facing, 0.0));
      }
    `,
    fragmentShader: `
      uniform vec3 dotColor;
      varying float facing;
      void main() {
        float radius = length(gl_PointCoord - 0.5);
        float alpha = (1.0 - smoothstep(0.34, 0.5, radius)) * smoothstep(0.0, 0.3, facing);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(dotColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  globe.add(new THREE.Points(geometry, material));

  return {
    resize() {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const dpr = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      material.uniforms.dotSize.value = Math.max(1.2, Math.min(width, height) / 310) * dpr;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    draw(rotation, dark) {
      globe.rotation.y = rotation;
      material.uniforms.dotColor.value.setHex(dark ? 0xff9b45 : 0xea580c);
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function createCanvasGlobe(host: HTMLDivElement, positions: Float32Array): GlobeRenderer | null {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;
  canvas.className = 'absolute inset-0 h-full w-full';
  host.appendChild(canvas);
  let width = 1;
  let height = 1;
  let dpr = 1;
  const tiltCos = Math.cos(TILT);
  const tiltSin = Math.sin(TILT);
  return {
    resize() {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    draw(rotation, dark) {
      context.clearRect(0, 0, width, height);
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const focalLength = height / (2 * Math.tan((21 * Math.PI) / 180));
      const dotRadius = Math.max(0.6, Math.min(width, height) / 620);
      context.fillStyle = dark ? '#ff9b45' : '#ea580c';
      // One path per depth band, avoiding a separate paint operation for every dot.
      const bands = Array.from({ length: 6 }, () => new Path2D());
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i] * cos + positions[i + 2] * sin;
        const z = -positions[i] * sin + positions[i + 2] * cos;
        const y = positions[i + 1] * tiltCos - z * tiltSin;
        const depth = positions[i + 1] * tiltSin + z * tiltCos;
        if (depth <= 0) continue;
        const perspective = focalLength / (6.5 - depth);
        const sx = width / 2 + x * perspective;
        const sy = height / 2 - y * perspective;
        const band = Math.min(5, Math.floor((depth / RADIUS) * 6));
        bands[band].moveTo(sx + dotRadius, sy);
        bands[band].arc(sx, sy, dotRadius, 0, Math.PI * 2);
      }
      bands.forEach((path, index) => {
        context.globalAlpha = 0.25 + index * 0.15;
        context.fill(path);
      });
      context.globalAlpha = 1;
    },
    dispose() {
      canvas.remove();
    },
  };
}

export function DotMatrixGlobe() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const positions = landPositions();
    let view: GlobeRenderer | null;
    try {
      view = createWebGLGlobe(host, positions);
    } catch {
      host.replaceChildren();
      view = createCanvasGlobe(host, positions);
    }
    if (!view) return;
    const globe = view;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dark = isResolvedDark();
    let rotation = INITIAL_ROTATION;
    let frame = 0;
    let previousTime: number | null = null;
    let inView = true;
    let disposed = false;
    const draw = () => globe.draw(rotation, dark);
    const tick = (time: number) => {
      if (disposed) return;
      if (previousTime !== null) rotation += Math.min(time - previousTime, 64) * ROTATION_SPEED;
      previousTime = time;
      draw();
      frame = requestAnimationFrame(tick);
    };
    const syncAnimation = () => {
      cancelAnimationFrame(frame);
      previousTime = null;
      if (disposed) return;
      draw();
      if (!motion.matches && !document.hidden && inView) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => {
      globe.resize();
      draw();
    });
    resize.observe(host);
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncAnimation();
    });
    visibility.observe(host);
    const unsubscribeTheme = subscribeToResolvedTheme((theme) => {
      dark = theme === 'dark';
      draw();
    });
    document.addEventListener('visibilitychange', syncAnimation);
    motion.addEventListener('change', syncAnimation);
    globe.resize();
    syncAnimation();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      unsubscribeTheme();
      document.removeEventListener('visibilitychange', syncAnimation);
      motion.removeEventListener('change', syncAnimation);
      globe.dispose();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden="true" data-globe-canvas />;
}
