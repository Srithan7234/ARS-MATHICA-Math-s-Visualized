import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { vertexShader, fragmentShader } from '../utils/shaders';
import { FractalMode, HandGestures, AnimationPreset } from '../types';

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

interface FractalVisProps {
  mode: FractalMode;
  onStatsUpdate: (stats: string) => void;
  attractionSensitivity: number; 
  pinchSensitivity: number;      
  morphSpeed: number;           
  iterations?: number; 
  power?: number;     
  interactiveMode?: boolean;
  activeAnimation?: AnimationPreset; 
  colorMode?: number;
}

export interface FractalVisRef {
    captureImage: () => string;
}

const PARTICLE_COUNT = 80000;

const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export const FractalVis = forwardRef<FractalVisRef, FractalVisProps>(({ 
  mode, 
  onStatsUpdate,
  attractionSensitivity,
  pinchSensitivity,
  morphSpeed,
  iterations = 20,
  power = 8.0,
  interactiveMode = true,
  activeAnimation = 'NONE',
  colorMode = 0
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  
  // Navigation State
  const navRef = useRef({
      zoom: 1.0,
      pan: new THREE.Vector2(0, 0),
      isDragging: false,
      lastMouse: new THREE.Vector2(0, 0)
  });

  // State Refs
  const gesturesRef = useRef<HandGestures>({
    indexTip: { x: 0, y: 0, z: 0 },
    isPinching: false,
    pinchDistance: 0,
    isPalmOpen: false,
    isFist: false,
    isSnapping: false,
    isWaving: false,
    isStopped: false,
    wristRotation: 0,
    isVisible: false,
    isClapping: false,
    handsDistance: 100
  });

  const smoothedRef = useRef({
    handPos: new THREE.Vector3(100, 100, 100),
    pinch: 0,
    rotation: 0,
    attract: 0,
    repel: 0
  });
  
  const waveHistoryRef = useRef<number[]>([]);

  // Refs for logic
  const modeRef = useRef(mode);
  const animationRef = useRef(activeAnimation);
  const paramsRef = useRef({ attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, colorMode });

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { animationRef.current = activeAnimation; }, [activeAnimation]);
  useEffect(() => {
    paramsRef.current = { attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, colorMode };
  }, [attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, colorMode]);
  
  useImperativeHandle(ref, () => ({
      captureImage: () => {
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
              return rendererRef.current.domElement.toDataURL("image/png");
          }
          return "";
      }
  }));

  // --- MOUSE CONTROLS ---
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          const zoomSpeed = 0.05;
          const delta = -Math.sign(e.deltaY) * zoomSpeed;
          navRef.current.zoom *= (1 + delta);
          navRef.current.zoom = Math.max(0.1, Math.min(navRef.current.zoom, 10000.0));
      };

      const handleMouseDown = (e: MouseEvent) => {
          navRef.current.isDragging = true;
          navRef.current.lastMouse.set(e.clientX, e.clientY);
      };

      const handleMouseMove = (e: MouseEvent) => {
          if (!navRef.current.isDragging) return;
          const dx = e.clientX - navRef.current.lastMouse.x;
          const dy = e.clientY - navRef.current.lastMouse.y;
          
          const panSpeed = 0.005 / navRef.current.zoom;
          navRef.current.pan.x -= dx * panSpeed;
          navRef.current.pan.y += dy * panSpeed; 
          
          navRef.current.lastMouse.set(e.clientX, e.clientY);
      };

      const handleMouseUp = () => {
          navRef.current.isDragging = false;
      };

      canvas.addEventListener('wheel', handleWheel, { passive: false });
      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
          canvas.removeEventListener('wheel', handleWheel);
          canvas.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, []);

  useEffect(() => {
    let isActive = true;
    if (!containerRef.current || !canvasRef.current || !videoRef.current) return;

    // --- Three.js Init ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
      powerPreference: "high-performance",
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    rendererRef.current = renderer;

    // --- Particles ---
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const randoms = new Float32Array(PARTICLE_COUNT * 3);

    const radius = 3.0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * radius;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = Math.random() * 1.5 + 0.5; 
      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = Math.random();
      randoms[i * 3 + 2] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMode: { value: 0 },
        uHandPos: { value: new THREE.Vector3(100, 100, 100) },
        uAttractStrength: { value: 0 },
        uRepelStrength: { value: 0 },
        uPower: { value: 8.0 },
        uJuliaC: { value: new THREE.Vector2(0.355, 0.355) },
        uPinchScale: { value: 0.0 },
        uExplosion: { value: 0.0 },
        uChaos: { value: 0.0 },
        uSnap: { value: 0.0 },
        uMaxIter: { value: 20.0 },
        uVisualMode: { value: 0.0 },
        uZoom: { value: 1.0 },
        uPan: { value: new THREE.Vector2(0, 0) },
        uColorMode: { value: 0.0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = material;

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // --- Post Processing ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.8, 0.5, 0.2));
    composerRef.current = composer;

    // --- MediaPipe ---
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
    });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    
    hands.onResults((results: Results) => {
      if (!isActive) return;
      const landmarks = results.multiHandLandmarks;
      if (landmarks.length > 0) {
        const g = gesturesRef.current;
        g.isVisible = true;
        const hand1 = landmarks[0];
        g.indexTip = { x: (hand1[8].x - 0.5) * -12, y: (hand1[8].y - 0.5) * -8, z: 0 };
        const dist = Math.sqrt(Math.pow(hand1[4].x - hand1[8].x, 2) + Math.pow(hand1[4].y - hand1[8].y, 2));
        g.pinchDistance = dist;
        g.isPinching = dist < 0.05;
        g.isSnapping = Math.sqrt(Math.pow(hand1[4].x - hand1[12].x, 2) + Math.pow(hand1[4].y - hand1[12].y, 2)) < 0.04 && dist > 0.06;
        g.wristRotation = Math.atan2(hand1[0].y - hand1[9].y, hand1[0].x - hand1[9].x);
        const palmDist = Math.sqrt(Math.pow(hand1[5].x - hand1[17].x, 2) + Math.pow(hand1[5].y - hand1[17].y, 2));
        g.isPalmOpen = palmDist > 0.15 && !g.isPinching;
        g.isStopped = g.isPalmOpen;
        
        // Fist Check
        let tipSum = 0;
        [8,12,16,20].forEach(i => tipSum += Math.sqrt(Math.pow(hand1[i].x - hand1[0].x, 2) + Math.pow(hand1[i].y - hand1[0].y, 2)));
        g.isFist = (tipSum / 4) < 0.3 && !g.isPalmOpen;

        // Wave Check
        const h = waveHistoryRef.current;
        h.push(hand1[9].x);
        if (h.length > 20) h.shift();
        let range = 0;
        if (h.length > 10) range = Math.max(...h) - Math.min(...h);
        g.isWaving = range > 0.25 && !g.isFist;
        
        // Clap Check
        if (landmarks.length === 2) {
            g.isClapping = Math.sqrt(Math.pow(hand1[9].x - landmarks[1][9].x, 2) + Math.pow(hand1[9].y - landmarks[1][9].y, 2)) < 0.12;
        } else {
            g.isClapping = false;
        }
      } else {
        gesturesRef.current.isVisible = false;
      }
    });

    const startCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: {ideal:640}, height: {ideal:480}, facingMode: 'user' } });
            if (videoRef.current && isActive) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    requestAnimationFrame(processVideoFrame);
                };
            }
        } catch (e) { 
            console.warn("Camera access denied or unavailable", e);
            // Optionally set state here to show UI feedback
        }
    };
    const processVideoFrame = async () => {
        if (!isActive) return;
        if (videoRef.current?.readyState >= 2) {
            try {
                await hands.send({ image: videoRef.current });
            } catch (err) {
                // Ignore transient send errors
            }
        }
        if (isActive) requestAnimationFrame(processVideoFrame);
    };
    startCamera();

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let currentModeVal = 0.0;
    let evolutionTime = 0.0;
    let currentJuliaX = 0.355, currentJuliaY = 0.355;
    
    // Animation Preset State
    let animPhase = 0.0;

    const animate = () => {
      if (!canvasRef.current || !isActive) return;
      const dt = clock.getDelta();
      const u = materialRef.current?.uniforms;
      const { attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, colorMode } = paramsRef.current;
      const anim = animationRef.current;

      if (u) {
        // --- ANIMATION PRESETS ENGINE ---
        if (anim && anim !== 'NONE') {
            animPhase += dt;
            
            // Override controls based on preset
            if (anim === 'MANDELBROT_DIVE') {
                targetMode = 2.0; // Mandelbrot
                navRef.current.zoom *= (1.0 + dt * 0.5); // Constant zoom in
                // Target a spiral arm
                const tx = -0.745; 
                const ty = 0.186;
                navRef.current.pan.x = lerp(navRef.current.pan.x, tx, dt * 0.1);
                navRef.current.pan.y = lerp(navRef.current.pan.y, ty, dt * 0.1);
                u.uMaxIter.value = 100.0;
            } else if (anim === 'JULIA_MORPH') {
                targetMode = 1.0; // Julia
                navRef.current.zoom = 1.2;
                navRef.current.pan.set(0,0);
                u.uJuliaC.value.x = Math.sin(animPhase * 0.5) * 0.7;
                u.uJuliaC.value.y = Math.cos(animPhase * 0.3) * 0.7;
            } else if (anim === 'UNIVERSE_TOUR') {
                // Cycle through modes every 5 seconds
                const cycle = (animPhase * 0.2) % 7;
                targetMode = Math.floor(cycle);
                u.uVisualMode.value = 1.0; // Force visual mode style
            } else if (anim === 'COLOR_SYMPHONY') {
                // Rapid time evolution for colors
                evolutionTime += dt * 5.0; 
                targetMode = currentModeVal; // Keep current mode
            } else if (anim === 'INFINITY_ZOOM') {
                 targetMode = 2.0;
                 navRef.current.zoom *= 1.01;
                 if (navRef.current.zoom > 1000.0) navRef.current.zoom = 1.0; // Loop
            } else {
                // Default interactive behavior fall-through
            }
            
            // Force visual mode rendering during presets
            u.uVisualMode.value = 1.0;
            
        } else {
            // --- STANDARD INTERACTIVE LOGIC ---
            u.uMaxIter.value = iterations;
            u.uPower.value = power;
            u.uColorMode.value = colorMode;

            // Mode Interpolation
            if (modeRef.current === FractalMode.JULIA_2D) targetMode = 1.0;
            else if (modeRef.current === FractalMode.MANDELBROT) targetMode = 2.0;
            else if (modeRef.current === FractalMode.TRICORN) targetMode = 3.0;
            else if (modeRef.current === FractalMode.BURNING_SHIP) targetMode = 4.0;
            else if (modeRef.current === FractalMode.MENGER_SPONGE) targetMode = 5.0;
            else if (modeRef.current === FractalMode.SIERPINSKI) targetMode = 6.0;
            else targetMode = 0.0;
            
            if (interactiveMode) {
                 if (!gesturesRef.current.isStopped) evolutionTime += dt;
                 u.uVisualMode.value = 0.0;
                 // (Gesture logic here omitted for brevity but preserved in final code)
                 const g = gesturesRef.current;
                 if (g.isVisible) {
                     const rawPos = new THREE.Vector3(g.indexTip.x, g.indexTip.y, g.indexTip.z);
                     smoothedRef.current.handPos.lerp(rawPos, 0.1);
                     u.uHandPos.value.copy(smoothedRef.current.handPos);
                     
                     // Map gestures to uniforms...
                     u.uAttractStrength.value = lerp(u.uAttractStrength.value, (g.isPinching||g.isStopped?0:1)*attractionSensitivity, 0.1);
                     u.uRepelStrength.value = lerp(u.uRepelStrength.value, (g.isStopped?1:0)*attractionSensitivity, 0.1);
                     u.uPinchScale.value = lerp(u.uPinchScale.value, (g.isPinching?1:0)*pinchSensitivity, 0.1);
                     u.uExplosion.value = lerp(u.uExplosion.value, (g.isClapping?1:0), 0.1);
                     u.uChaos.value = lerp(u.uChaos.value, (g.isFist?1:0), 0.1);
                     u.uSnap.value = lerp(u.uSnap.value, (g.isSnapping?1:0), 0.1);
                     
                     // Wrist rotation for Julia
                     smoothedRef.current.rotation = lerp(smoothedRef.current.rotation, g.wristRotation, morphSpeed);
                     currentJuliaX = 0.7885 * Math.cos(smoothedRef.current.rotation * 2.5);
                     currentJuliaY = 0.7885 * Math.sin(smoothedRef.current.rotation * 2.5);
                     u.uJuliaC.value.set(currentJuliaX, currentJuliaY);
                     
                     // Wave to pan camera
                     if (g.isWaving) cameraRef.current!.position.x = lerp(cameraRef.current!.position.x, g.indexTip.x * 0.5, 0.05);
                 } else {
                     u.uHandPos.value.set(100,100,100);
                     u.uAttractStrength.value *= 0.95;
                 }
            } else {
                 u.uVisualMode.value = 1.0;
                 u.uHandPos.value.set(100,100,100);
            }
        }

        // Apply Common Uniforms
        u.uMode.value += (targetMode - u.uMode.value) * dt * 3.0;
        u.uTime.value = evolutionTime;
        u.uZoom.value = navRef.current.zoom;
        u.uPan.value = navRef.current.pan;
        
        // Camera Orbit
        if (interactiveMode && (!gesturesRef.current.isVisible || !gesturesRef.current.isWaving)) {
            cameraRef.current!.position.x = Math.sin(evolutionTime * 0.1) * 0.5;
            cameraRef.current!.position.y = Math.cos(evolutionTime * 0.15) * 0.5;
            cameraRef.current!.lookAt(0,0,0);
        } else if (!interactiveMode || (anim && anim !== 'NONE')) {
            // Reset camera for visual/animation modes
            cameraRef.current!.position.set(0,0,5);
            cameraRef.current!.lookAt(0,0,0);
        }
        
        particlesRef.current!.rotation.y = (interactiveMode) ? evolutionTime * 0.05 : 0;
      }
      
      composerRef.current?.render();
      if (isActive) requestAnimationFrame(animate);
    };
    
    // Helper variable for targetMode inside animate loop
    let targetMode = 0.0;
    
    animate();

    const resizeObserver = new ResizeObserver(() => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        cameraRef.current!.aspect = w / h;
        cameraRef.current!.updateProjectionMatrix();
        rendererRef.current!.setSize(w, h);
        composerRef.current!.setSize(w, h);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      isActive = false;
      resizeObserver.disconnect();
      renderer.dispose();
      try { hands.close(); } catch(e) {}
    };
  }, []); 

    return (
    <div ref={containerRef} className="w-full h-full cursor-move">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
});

FractalVis.displayName = 'FractalVis';

