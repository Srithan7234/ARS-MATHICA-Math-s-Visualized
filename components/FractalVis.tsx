import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { quadVertexShader, quadFragmentShader, particleVertexShader, particleFragmentShader } from '../utils/shaders';
import { FractalMode, HandGestures, AnimationPreset, InteractionMode } from '../types';

// Prevent SSR Execution
const isBrowser = typeof window !== "undefined";

export interface FractalVisRef {
  captureImage: () => string;
}

declare class Hands {
  constructor(config: { locateFile: (file: string) => string });
  setOptions(options: any): void;
  onResults(callback: (results: any) => void): void;
  send(input: any): Promise<void>;
  close(): void;
}

interface Results {
  multiHandLandmarks: any[][];
  image: any;
  multiHandedness: any[];
}

// Damp util
const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

const triggerHaptic = (pattern: number | number[]) => {
  if (isBrowser && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

const dist = (p1: any, p2: any) =>
  Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

export const FractalVis = forwardRef<FractalVisRef, any>((props, ref) => {
  if (!isBrowser) return <div />; // IMPORTANT: Fixes Vercel SSR crash

  const {
    mode,
    onStatsUpdate,
    attractionSensitivity,
    pinchSensitivity,
    morphSpeed,
    iterations = 100,
    power = 8.0,
    interactiveMode = false,
    activeAnimation = 'NONE',
    colorMode = 1
  } = props;

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);

  // Mesh & Material Refs
  const quadMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesMeshRef = useRef<THREE.Points | null>(null);
  const quadMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const particlesMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // MediaPipe Hands
  const handsRef = useRef<Hands | null>(null);
  const requestRef = useRef<number>(0);
  const videoRequestRef = useRef<number>(0);

  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>(InteractionMode.OBJECT_ORBIT);
  const interactionModeRef = useRef(interactionMode);

  const navRef = useRef({
    zoom: 1.0,
    pan: new THREE.Vector2(0, 0),
    rotation: new THREE.Vector2(0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    isDragging: false,
    lastMouse: new THREE.Vector2(0, 0)
  });

  const gesturesRef = useRef<HandGestures>({
    indexTip: { x: 0, y: 0, z: 0 },
    wristPos: { x: 0, y: 0, z: 0 },
    isPinching: false,
    isPalmOpen: false,
    isFist: false,
    isPointing: false,
    isVictory: false,
    isSnapping: false,
    isWaving: false,
    isClapping: false,
    isPunching: false,
    isTwoHandSmash: false,
    handsDistance: 100,
    handsCount: 0,
    gestureName: "Searching..."
  });

  const physicsRef = useRef({
    prevWristZ: 0,
    punchVelocity: 0,
    clapCooldown: 0,
    snapCooldown: 0,
    lastHandPos: new THREE.Vector3(0, 0, 0),
    wasFist: false,
    wasPunching: false,
    wasVictory: false,
    wasSmash: false
  });

  const propsRef = useRef({
    mode,
    attractionSensitivity,
    pinchSensitivity,
    morphSpeed,
    iterations,
    power,
    interactiveMode,
    activeAnimation,
    colorMode
  });

  useEffect(() => {
    propsRef.current = {
      mode,
      attractionSensitivity,
      pinchSensitivity,
      morphSpeed,
      iterations,
      power,
      interactiveMode,
      activeAnimation,
      colorMode
    };
  }, [mode, attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, activeAnimation, colorMode]);

  useImperativeHandle(ref, () => ({
    captureImage: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
        return "";
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL("image/png");
    }
  }));
  // -----------------------------
  // MOUSE CONTROLS (SAFE)
  // -----------------------------
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.15;
      const nextZoom = navRef.current.zoom * (1 + delta);

      if (nextZoom > 0.0001 && nextZoom < 50000) {
        navRef.current.zoom = nextZoom;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      navRef.current.isDragging = true;
      navRef.current.lastMouse.set(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!navRef.current.isDragging) return;

      const dx = e.clientX - navRef.current.lastMouse.x;
      const dy = e.clientY - navRef.current.lastMouse.y;

      const panSpeed = 0.003 / navRef.current.zoom;
      navRef.current.pan.x -= dx * panSpeed;
      navRef.current.pan.y += dy * panSpeed;

      navRef.current.lastMouse.set(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      navRef.current.isDragging = false;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);


  // -----------------------------
  // THREE.JS INIT (FIXED FOR VERCEL)
  // -----------------------------
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const aspect = width / height;
    const viewSize = 3;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      -10,
      10
    );
    camera.position.z = 2;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    // Composer
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0, 0, 0));
    composerRef.current = composer;

    // -----------------------------
    // QUAD MATERIAL (VISUAL 2D)
    // -----------------------------
    const quadGeo = new THREE.PlaneGeometry(viewSize * aspect * 2, viewSize * 2);

    const quadMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uMode: { value: 0 },
        uJuliaC: { value: new THREE.Vector2(-0.7, 0.27015) },
        uPower: { value: 8 },
        uMaxIter: { value: 100 },
        uZoom: { value: 1 },
        uPan: { value: new THREE.Vector2(0, 0) },
        uColorMode: { value: 0 },
        uChaos: { value: 0 }
      },
      vertexShader: quadVertexShader,
      fragmentShader: quadFragmentShader,
      depthWrite: false,
      depthTest: false
    });

    quadMaterialRef.current = quadMat;

    const quadMesh = new THREE.Mesh(quadGeo, quadMat);
    scene.add(quadMesh);
    quadMeshRef.current = quadMesh;

    // -----------------------------
    // PARTICLE MATERIAL (INTERACTIVE)
    // -----------------------------
    const particleCount = 120000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) pos[i] = (Math.random() - 0.5) * 4;
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const partMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMode: { value: 0 },
        uJuliaC: { value: new THREE.Vector2(-0.7, 0.27015) },
        uPower: { value: 8 },
        uHandPos: { value: new THREE.Vector3(100, 100, 100) },
        uAttractStrength: { value: 0 },
        uRepelStrength: { value: 0 },
        uZoom: { value: 1 },
        uPan: { value: new THREE.Vector2(0, 0) },
        uColorMode: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader
    });

    particlesMaterialRef.current = partMat;

    const particleMesh = new THREE.Points(geo, partMat);
    scene.add(particleMesh);
    particlesMeshRef.current = particleMesh;
    // -----------------------------
    // ANIMATION LOOP (FIXED)
    // -----------------------------
    let currentModeVal = 0;
    let targetMode = 0;
    let time = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const p = propsRef.current;
      const dt = Math.min(clock.getDelta(), 0.1);
      time += dt * 0.2;

      const quadU = quadMaterialRef.current?.uniforms;
      const partU = particlesMaterialRef.current?.uniforms;

      // Ensure uniforms exist before writing (fixes undefined crash)
      if (!quadU || !partU || !rendererRef.current || !sceneRef.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const u = p.interactiveMode ? partU : quadU;

      // MODE SWITCH (visual vs interactive)
      if (quadMeshRef.current) quadMeshRef.current.visible = !p.interactiveMode;
      if (particlesMeshRef.current) particlesMeshRef.current.visible = p.interactiveMode;

      // -----------------------------
      // SET MODE
      // -----------------------------
      switch (p.mode) {
        case FractalMode.JULIA_2D: targetMode = 1; break;
        case FractalMode.MANDELBROT: targetMode = 2; break;
        case FractalMode.TRICORN: targetMode = 3; break;
        case FractalMode.BURNING_SHIP: targetMode = 4; break;
        default: targetMode = 2;
      }

      currentModeVal = damp(currentModeVal, targetMode, 5, dt);
      u.uMode.value = currentModeVal;

      // -----------------------------
      // UPDATE UNIFORMS SAFELY
      // -----------------------------
      u.uTime.value = time;
      u.uPower.value = p.power;
      u.uColorMode.value = p.colorMode;

      if (!p.interactiveMode && quadU.uMaxIter) quadU.uMaxIter.value = p.iterations;

      // ZOOM + PAN
      u.uZoom.value = damp(u.uZoom.value, navRef.current.zoom, 8, dt);
      u.uPan.value.lerp(navRef.current.pan, 1 - Math.exp(-10 * dt));

      // -----------------------------
      // RESIZE FIX
      // -----------------------------
      const w = containerRef.current?.clientWidth ?? 1;
      const h = containerRef.current?.clientHeight ?? 1;

      if (rendererRef.current.getSize(new THREE.Vector2()).x !== w) {
        rendererRef.current.setSize(w, h);
        composerRef.current?.setSize(w, h);

        const aspect = w / h;
        cameraRef.current!.left = -3 * aspect;
        cameraRef.current!.right = 3 * aspect;
        cameraRef.current!.updateProjectionMatrix();

        if (quadU.uResolution) quadU.uResolution.value.set(w, h);
      }

      // -----------------------------
      // RENDER
      // -----------------------------
      if (p.interactiveMode) composerRef.current?.render();
      else rendererRef.current.render(sceneRef.current, cameraRef.current!);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestRef.current);
      rendererRef.current?.dispose();
    };
  }, []);
    // 5. Animation Loop
    const clock = new THREE.Clock();
    let currentModeVal = 0.0;
    let evolutionTime = 0.0;
    let targetMode = 0.0;
    let animPhase = 0.0;

    const animate = () => {
      const p = propsRef.current;
      const dt = Math.min(clock.getDelta(), 0.1);
      const mode = interactionModeRef.current;
      const g = gesturesRef.current;
      const phys = physicsRef.current;

      if (quadMeshRef.current)
        quadMeshRef.current.visible = !p.interactiveMode;

      if (particlesMeshRef.current)
        particlesMeshRef.current.visible = p.interactiveMode;

      const u = p.interactiveMode
        ? particlesMaterialRef.current?.uniforms
        : quadMaterialRef.current?.uniforms;

      if (u && rendererRef.current && sceneRef.current && cameraRef.current) {
        const cw = Math.max(1, containerRef.current?.clientWidth || width);
        const ch = Math.max(1, containerRef.current?.clientHeight || height);

        if (
          canvasRef.current!.width !==
            cw * Math.min(window.devicePixelRatio, 2.0) ||
          canvasRef.current!.height !==
            ch * Math.min(window.devicePixelRatio, 2.0)
        ) {
          rendererRef.current.setSize(cw, ch);
          composerRef.current?.setSize(cw, ch);

          if (!p.interactiveMode && u.uResolution)
            u.uResolution.value.set(cw, ch);

          const newAspect = cw / ch;
          cameraRef.current.left = -viewSize * newAspect;
          cameraRef.current.right = viewSize * newAspect;
          cameraRef.current.top = viewSize;
          cameraRef.current.bottom = -viewSize;
          cameraRef.current.updateProjectionMatrix();
        }

        // --- GESTURES LOGIC (Reduced + stabilized) ---
        if (p.interactiveMode && g.handsCount > 0) {
          // CLAP — toggle mode
          if (g.isClapping && phys.clapCooldown <= 0) {
            const newMode =
              mode === InteractionMode.OBJECT_ORBIT
                ? InteractionMode.IMMERSIVE_FLY
                : InteractionMode.OBJECT_ORBIT;
            setInteractionMode(newMode);
            triggerHaptic([40, 40]);
            phys.clapCooldown = 0.8;
          }
          if (phys.clapCooldown > 0) phys.clapCooldown -= dt;

          // SNAP — change color palette
          if (g.isSnapping && phys.snapCooldown <= 0) {
            u.uColorMode.value = (u.uColorMode.value + 1) % 5;
            triggerHaptic(30);
            phys.snapCooldown = 0.4;
          }
          if (phys.snapCooldown > 0) phys.snapCooldown -= dt;

          // USE HAND POS FOR PARTICLES
          if (p.interactiveMode) {
            u.uHandPos.value.set(g.indexTip.x, g.indexTip.y, 0);

            const attract = g.isFist ? 3.0 : g.isPinching ? 1.2 : 0;
            const repel = g.isPalmOpen ? 0.8 : 0;

            u.uAttractStrength.value = damp(
              u.uAttractStrength.value,
              attract * p.attractionSensitivity,
              10,
              dt
            );

            u.uRepelStrength.value = damp(
              u.uRepelStrength.value,
              repel * p.attractionSensitivity,
              10,
              dt
            );
          }

          // Movement between ORBIT and FLY modes
          if (mode === InteractionMode.OBJECT_ORBIT) {
            if (g.isFist) {
              navRef.current.pan.x +=
                (g.indexTip.x - phys.lastHandPos.x) * 1.4;
              navRef.current.pan.y -=
                (g.indexTip.y - phys.lastHandPos.y) * 1.4;
            }
          } else if (mode === InteractionMode.IMMERSIVE_FLY) {
            if (g.isPalmOpen) {
              navRef.current.pan.x += g.indexTip.x * dt * 0.5;
              navRef.current.pan.y += g.indexTip.y * dt * 0.5;
            }
          }

          phys.lastHandPos.set(g.indexTip.x, g.indexTip.y, g.indexTip.z);
        }

        // --- ANIMATION PRESETS (cleaned) ---
        if (p.activeAnimation !== "NONE") {
          animPhase += dt;

          if (p.activeAnimation === "MANDELBROT_DIVE") {
            targetMode = 2.0;
            navRef.current.zoom *= 1.015;
            navRef.current.pan.set(-0.74364388703, 0.13182590421);
          } else if (p.activeAnimation === "JULIA_MORPH") {
            targetMode = 1.0;
            u.uJuliaC.value.x = Math.sin(animPhase * 0.4) * 0.7;
            u.uJuliaC.value.y = Math.cos(animPhase * 0.3) * 0.7;
          }
        } else {
          // NORMAL MODE SELECTION
          targetMode =
            p.mode === FractalMode.JULIA_2D
              ? 1.0
              : p.mode === FractalMode.MANDELBROT
              ? 2.0
              : p.mode === FractalMode.TRICORN
              ? 3.0
              : p.mode === FractalMode.BURNING_SHIP
              ? 4.0
              : p.mode === FractalMode.MANDELBULB_3D
              ? 0.0
              : p.mode === FractalMode.MENGER_SPONGE
              ? 5.0
              : 6.0;

          if (!p.interactiveMode && u.uMaxIter)
            u.uMaxIter.value = p.iterations ?? 100;
        }

        // --- Smooth Sync ---
        evolutionTime += dt * 0.2;
        u.uTime.value = evolutionTime;
        currentModeVal = damp(currentModeVal, targetMode, 6.0, dt);

        u.uMode.value = currentModeVal;
        u.uZoom.value = damp(u.uZoom.value, navRef.current.zoom, 8, dt);

        const vecDamp = 1 - Math.exp(-8 * dt);
        u.uPan.value.lerp(navRef.current.pan, vecDamp);

        // Render
        if (p.interactiveMode) {
          rendererRef.current.setClearColor(0x000000, 1);
          rendererRef.current.clear();
          composerRef.current?.render();
        } else {
          rendererRef.current.render(scene, cameraRef.current);
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestRef.current);
      rendererRef.current?.dispose();
    };
  }, []);
  // --- MEDIAPIPE ---
  useEffect(() => {
    if (!interactiveMode) {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    if (!handsRef.current) {
      const hands = new Hands({
        locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      hands.onResults((res: Results) => {
        const lm = res.multiHandLandmarks;
        const g = gesturesRef.current;

        g.handsCount = lm.length;

        if (lm.length === 0) {
          g.gestureName = "NO HANDS";
          return;
        }

        const h1 = lm[0];

        const mapX = (x: number) => (x - 0.5) * 4.0;
        const mapY = (y: number) => (y - 0.5) * -4.0;

        g.indexTip.x = mapX(h1[8].x);
        g.indexTip.y = mapY(h1[8].y);
        g.indexTip.z = h1[8].z;

        const d = dist;

        const pinch = d(h1[4], h1[8]);
        g.isPinching = pinch < 0.05;

        let sum = 0;
        [8, 12, 16, 20].forEach((i) => (sum += d(h1[i], h1[0])));
        const avg = sum / 4;

        g.isFist = avg < 0.25;
        g.isPalmOpen = !g.isFist && !g.isPinching && avg > 0.4;

        const middle = d(h1[12], h1[0]);
        g.isVictory = middle > 0.4 && avg < 0.3;

        const snapDist = d(h1[12], h1[4]);
        g.isSnapping = snapDist < 0.04;

        g.gestureName = g.isSnapping
          ? "SNAP"
          : g.isFist
          ? "FIST"
          : g.isPalmOpen
          ? "PALM"
          : g.isPinching
          ? "PINCH"
          : "TRACKING...";
      });

      handsRef.current = hands;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            processFrame();
          };
        }
      } catch (e) {
        console.warn("Camera unavailable");
      }
    };

    const processFrame = async () => {
      if (!interactiveMode) return;
      if (videoRef.current?.readyState >= 2)
        await handsRef.current?.send({ image: videoRef.current });
      videoRequestRef.current = requestAnimationFrame(processFrame);
    };

    startCamera();

    return () => cancelAnimationFrame(videoRequestRef.current);
  }, [interactiveMode]);

  return (
    <div ref={containerRef} className="w-full h-full bg-black relative overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
});

FractalVis.displayName = "FractalVis";
