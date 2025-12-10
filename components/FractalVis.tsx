
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { quadVertexShader, quadFragmentShader, particleVertexShader, particleFragmentShader } from '../utils/shaders';
import { FractalMode, HandGestures, AnimationPreset, InteractionMode } from '../types';
import { Camera, Hand, MousePointer, Scan, Zap, Move3d, Maximize } from 'lucide-react';

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

// Frame-rate independent damping
const damp = (current: number, target: number, lambda: number, dt: number) => {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
};

// Haptic feedback helper
const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Ignore if vibration not supported/allowed
        }
    }
};

// --- GESTURE UTILS ---
const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

export const FractalVis = forwardRef<FractalVisRef, FractalVisProps>(({ 
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
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  
  // Mesh Refs
  const quadMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesMeshRef = useRef<THREE.Points | null>(null);
  const quadMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const particlesMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  // MediaPipe Refs
  const handsRef = useRef<Hands | null>(null);
  const requestRef = useRef<number>(0);
  const videoRequestRef = useRef<number>(0);

  // State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.OBJECT_ORBIT);
  const interactionModeRef = useRef<InteractionMode>(InteractionMode.OBJECT_ORBIT); // Ref for animation loop access

  // Physics / Navigation State
  const navRef = useRef({
      zoom: 1.0, 
      pan: new THREE.Vector2(0, 0),
      rotation: new THREE.Vector2(0, 0), // X = horizontal rot, Y = vertical
      velocity: new THREE.Vector3(0,0,0),
      isDragging: false,
      lastMouse: new THREE.Vector2(0,0)
  });

  // Gesture State
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

  // Smoothing & Physics Refs
  const physicsRef = useRef({
      prevWristZ: 0,
      punchVelocity: 0,
      clapCooldown: 0,
      snapCooldown: 0,
      lastHandPos: new THREE.Vector3(0,0,0),
      // State tracking for haptics
      wasFist: false,
      wasPunching: false,
      wasVictory: false,
      wasSmash: false
  });
  
  // Props Refs
  const propsRef = useRef({ 
      mode, attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, activeAnimation, colorMode 
  });

  useEffect(() => {
    propsRef.current = { mode, attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, activeAnimation, colorMode };
  }, [mode, attractionSensitivity, pinchSensitivity, morphSpeed, iterations, power, interactiveMode, activeAnimation, colorMode]);

  // Sync state to ref
  useEffect(() => { interactionModeRef.current = interactionMode; }, [interactionMode]);

  useImperativeHandle(ref, () => ({
      captureImage: () => {
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
              return rendererRef.current.domElement.toDataURL("image/png");
          }
          return "";
      }
  }));

  // --- MOUSE CONTROLS (Improved responsiveness) ---
  useEffect(() => {
      // Use container ref for broader hit area if canvas is blocked (though HUD is pointer-events-none)
      // Actually sticking to window for moves is best, canvas for wheel
      const target = canvasRef.current;
      if (!target) return;

      const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          e.stopPropagation();
          
          const zoomSpeed = 0.15; // Snappier zoom
          const delta = -Math.sign(e.deltaY) * zoomSpeed;
          
          // Safety clamp to prevent infinity or zero
          const newZoom = navRef.current.zoom * (1 + delta);
          if (newZoom > 0.0001 && newZoom < 100000) {
              navRef.current.zoom = newZoom;
          }
      };

      const handleMouseDown = (e: MouseEvent) => {
          navRef.current.velocity.set(0,0,0); // Stop momentum on click
          navRef.current.lastMouse = new THREE.Vector2(e.clientX, e.clientY);
          navRef.current.isDragging = true;
      };

      const handleMouseMove = (e: MouseEvent) => {
          if (!navRef.current.isDragging) return;
          const dx = e.clientX - (navRef.current.lastMouse?.x || 0);
          const dy = e.clientY - (navRef.current.lastMouse?.y || 0);
          
          // Adjust pan speed relative to zoom
          const panSpeed = 0.003 / navRef.current.zoom;
          navRef.current.pan.x -= dx * panSpeed;
          navRef.current.pan.y += dy * panSpeed; 
          
          navRef.current.lastMouse = new THREE.Vector2(e.clientX, e.clientY);
      };

      const handleMouseUp = () => {
          navRef.current.isDragging = false;
      };

      // Force non-passive to allow preventDefault
      target.addEventListener('wheel', handleWheel, { passive: false });
      target.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
          target.removeEventListener('wheel', handleWheel);
          target.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, []);

  // --- THREE.JS INIT ---
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const aspect = width / height;
    const viewSize = 3.0; 

    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect, 
      viewSize, -viewSize, 
      -10, 10
    );
    camera.position.z = 2;
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false, 
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
      alpha: false 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1); 
    rendererRef.current = renderer;

    // 3. Post Processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.0, 0.0, 0.0);
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // 4. Geometry & Shaders
    const quadGeo = new THREE.PlaneGeometry(viewSize * aspect * 2, viewSize * 2);
    
    // Quad Material (High Res)
    const quadMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uMode: { value: 0 },
        uJuliaC: { value: new THREE.Vector2(-0.7, 0.27015) },
        uPower: { value: 8.0 },
        uMaxIter: { value: 100.0 },
        uZoom: { value: 1.0 },
        uPan: { value: new THREE.Vector2(0, 0) },
        uColorMode: { value: 0.0 },
        uChaos: { value: 0.0 }
      },
      vertexShader: quadVertexShader,
      fragmentShader: quadFragmentShader,
      depthWrite: false,
      depthTest: false
    });
    quadMaterialRef.current = quadMat;
    const quad = new THREE.Mesh(quadGeo, quadMat);
    scene.add(quad);
    quadMeshRef.current = quad;

    // Particle Material (Interactive)
    const particleCount = 100000;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 4.0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const partMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMode: { value: 0 },
            uJuliaC: { value: new THREE.Vector2(-0.7, 0.27015) },
            uPower: { value: 8.0 },
            uHandPos: { value: new THREE.Vector3(100,100,100) },
            uAttractStrength: { value: 0 },
            uRepelStrength: { value: 0 },
            uZoom: { value: 1.0 },
            uPan: { value: new THREE.Vector2(0, 0) },
            uColorMode: { value: 0.0 }
        },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false 
    });
    particlesMaterialRef.current = partMat;
    const particles = new THREE.Points(particleGeo, partMat);
    scene.add(particles);
    particlesMeshRef.current = particles;

    // 5. Animation Loop
    const clock = new THREE.Clock();
    let currentModeVal = 0.0;
    let evolutionTime = 0.0;
    let targetMode = 0.0;
    let animPhase = 0.0;

    const animate = () => {
        const p = propsRef.current; 
        const dt = Math.min(clock.getDelta(), 0.1); // Cap dt to prevent jumps
        const mode = interactionModeRef.current;
        const g = gesturesRef.current;
        const phys = physicsRef.current;

        // Visibility
        if (quadMeshRef.current) quadMeshRef.current.visible = !p.interactiveMode;
        if (particlesMeshRef.current) particlesMeshRef.current.visible = p.interactiveMode;

        const u = p.interactiveMode ? particlesMaterialRef.current?.uniforms : quadMaterialRef.current?.uniforms;

        if (u && rendererRef.current && sceneRef.current && cameraRef.current) {
            
             // Handle Resize
            const cw = containerRef.current?.clientWidth || width;
            const ch = containerRef.current?.clientHeight || height;
            if (canvasRef.current!.width !== cw * Math.min(window.devicePixelRatio, 2.0) || canvasRef.current!.height !== ch * Math.min(window.devicePixelRatio, 2.0)) {
                rendererRef.current.setSize(cw, ch);
                composerRef.current?.setSize(cw, ch);
                if (!p.interactiveMode && u.uResolution) u.uResolution.value.set(cw, ch);
                
                const newAspect = cw / ch;
                cameraRef.current.left = -viewSize * newAspect;
                cameraRef.current.right = viewSize * newAspect;
                cameraRef.current.top = viewSize;
                cameraRef.current.bottom = -viewSize;
                cameraRef.current.updateProjectionMatrix();
            }

            // --- GESTURE-BASED STATE MACHINE ---
            if (p.interactiveMode && g.handsCount > 0) {
                
                // 1. CLAP -> Toggle Interaction Mode
                if (g.isClapping && phys.clapCooldown <= 0) {
                    const newMode = mode === InteractionMode.OBJECT_ORBIT ? InteractionMode.IMMERSIVE_FLY : InteractionMode.OBJECT_ORBIT;
                    setInteractionMode(newMode);
                    triggerHaptic([50, 50, 50]); // Distinct vibration
                    phys.clapCooldown = 1.0; // 1s cooldown
                }
                if (phys.clapCooldown > 0) phys.clapCooldown -= dt;

                // 2. SNAP -> Toggle Colors
                if (g.isSnapping && phys.snapCooldown <= 0) {
                    u.uColorMode.value = (u.uColorMode.value + 1) % 5;
                    triggerHaptic(50); // Sharp snap vibration
                    phys.snapCooldown = 0.5;
                }
                if (phys.snapCooldown > 0) phys.snapCooldown -= dt;

                // 3. PUNCH -> Rapid Zoom Pulse
                if (g.isPunching) {
                    navRef.current.zoom *= (1 + dt * 3.0); // Fast Zoom In
                    if (!phys.wasPunching) triggerHaptic(40); // Pulse feel
                }

                // 4. TWO HAND SMASH -> Reset / Explosion
                if (g.isTwoHandSmash) {
                    navRef.current.zoom = 1.0;
                    navRef.current.pan.set(0,0);
                    u.uRepelStrength.value = 5.0; // Massive repel
                    if (!phys.wasSmash) triggerHaptic([80, 50, 80]); // Heavy impact
                }

                // 5. VICTORY -> Freeze Time
                if (g.isVictory) {
                    evolutionTime -= dt; // Counteract time add
                    if (!phys.wasVictory) triggerHaptic([30, 30]);
                }

                // 6. FIST (Grab) Haptic
                if (g.isFist && !phys.wasFist) {
                    triggerHaptic(20); // Subtle click on grab
                }

                // Update previous states
                phys.wasFist = g.isFist;
                phys.wasPunching = g.isPunching;
                phys.wasVictory = g.isVictory;
                phys.wasSmash = g.isTwoHandSmash;

                // --- NAVIGATION LOGIC ---
                if (mode === InteractionMode.OBJECT_ORBIT) {
                    // OBJECT MODE: Hand moves the object (Orbit)
                    if (g.isFist) {
                        // "Grab" and Rotate - Increased sensitivity
                        const deltaX = (g.indexTip.x - phys.lastHandPos.x) * 2.5;
                        const deltaY = (g.indexTip.y - phys.lastHandPos.y) * 2.5;
                        navRef.current.pan.x += deltaX; 
                        navRef.current.pan.y -= deltaY;
                    } else if (g.isPinching) {
                         // Pinch to Zoom
                         const zoomFactor = 1.0 + (g.indexTip.y - phys.lastHandPos.y) * 1.5;
                         navRef.current.zoom *= zoomFactor;
                    }
                } 
                else if (mode === InteractionMode.IMMERSIVE_FLY) {
                    // FLY MODE: Hand is a joystick
                    // Center of screen is (0,0). 
                    if (g.isFist) {
                        // Throttle / Move Forward
                         navRef.current.zoom *= (1 + dt * 0.8);
                    } else if (g.isPalmOpen) {
                        // Steering
                        const steerX = g.indexTip.x * 0.8;
                        const steerY = g.indexTip.y * 0.8;
                        navRef.current.pan.x += steerX * dt;
                        navRef.current.pan.y += steerY * dt;
                    }
                }

                phys.lastHandPos.set(g.indexTip.x, g.indexTip.y, g.indexTip.z);
            } else {
                // Reset haptic states if hands lost
                phys.wasFist = false;
                phys.wasPunching = false;
            }

            // --- ANIMATION PRESETS ---
            if (p.activeAnimation !== 'NONE') {
                animPhase += dt;
                // ... (Existing animation logic preserved) ...
                if (p.activeAnimation === 'MANDELBROT_DIVE') {
                    targetMode = 2.0;
                    navRef.current.zoom = Math.pow(1.8, animPhase);
                    navRef.current.pan.set(-0.74364388703, 0.13182590421); 
                } else if (p.activeAnimation === 'JULIA_MORPH') {
                    targetMode = 1.0; 
                    u.uJuliaC.value.x = Math.cos(animPhase * 0.5) * 0.7885;
                    u.uJuliaC.value.y = Math.sin(animPhase * 0.3) * 0.7885;
                } else {
                     // Default cycle
                     targetMode = Math.floor(animPhase / 5.0) % 7;
                }
                
                u.uZoom.value = navRef.current.zoom;
                u.uPan.value.lerp(navRef.current.pan, 0.1);
            } else {
                // --- MANUAL UPDATES ---
                if (p.mode === FractalMode.JULIA_2D) targetMode = 1.0;
                else if (p.mode === FractalMode.MANDELBROT) targetMode = 2.0;
                else if (p.mode === FractalMode.TRICORN) targetMode = 3.0;
                else if (p.mode === FractalMode.BURNING_SHIP) targetMode = 4.0;
                else if (p.mode === FractalMode.MANDELBULB_3D) targetMode = 0.0;
                else if (p.mode === FractalMode.MENGER_SPONGE) targetMode = 5.0;
                else if (p.mode === FractalMode.SIERPINSKI) targetMode = 6.0;

                // GUARD ADDED HERE: uMaxIter only exists on quad material
                if (!p.interactiveMode && u.uMaxIter) {
                    u.uMaxIter.value = p.iterations || 100;
                }
                
                u.uPower.value = p.power || 8.0;

                // Sync Physics to Uniforms with SMOOTH DAMPING
                // Damping factor: Higher lambda = faster convergence
                const smoothLambda = 10.0; 
                u.uZoom.value = damp(u.uZoom.value, navRef.current.zoom, smoothLambda, dt);
                
                // For Vector2, we calculate the lerp factor from damping formula
                const vecDampFactor = 1 - Math.exp(-smoothLambda * dt);
                u.uPan.value.lerp(navRef.current.pan, vecDampFactor);
                
                // Particle Interaction Specifics
                if (p.interactiveMode && g.handsCount > 0) {
                     u.uHandPos.value.set(g.indexTip.x, g.indexTip.y, 0); 
                     
                     let attract = 0.0;
                     let repel = 0.0;
                     
                     if (g.isTwoHandSmash) repel = 10.0; // Explosion
                     else if (g.isFist) attract = 3.0;   // Strong Gravity
                     else if (g.isPinching) attract = 1.0; // Weak Gravity
                     else repel = 0.5; // Gentle repel on hover

                     u.uAttractStrength.value = damp(u.uAttractStrength.value, attract * p.attractionSensitivity, 8.0, dt);
                     u.uRepelStrength.value = damp(u.uRepelStrength.value, repel * p.attractionSensitivity, 8.0, dt);
                }
            }

            evolutionTime += dt * 0.2;
            u.uTime.value = evolutionTime;
            currentModeVal = damp(currentModeVal, targetMode, 5.0, dt);
            u.uMode.value = currentModeVal;

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
        if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // --- MEDIAPIPE LOGIC ---
  useEffect(() => {
    if (!interactiveMode) {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        return;
    }

    if (!handsRef.current) {
        const hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        
        hands.onResults((results: Results) => {
          const landmarks = results.multiHandLandmarks;
          const g = gesturesRef.current;
          g.handsCount = landmarks.length;

          if (g.handsCount > 0) {
            const h1 = landmarks[0];
            
            // Map Coordinates (0..1) -> (-2..2)
            // Note: MediaPipe Y is inverted relative to Three.js usually
            const mapX = (x: number) => (x - 0.5) * 4.0;
            const mapY = (y: number) => (y - 0.5) * -4.0;

            g.indexTip.x = mapX(h1[8].x);
            g.indexTip.y = mapY(h1[8].y);
            g.indexTip.z = h1[8].z; // Depth relative to wrist

            g.wristPos.x = mapX(h1[0].x);
            g.wristPos.y = mapY(h1[0].y);
            g.wristPos.z = h1[0].z;

            // --- GESTURE RECOGNITION ---
            
            // 1. Pinch Detection
            const pinchDist = dist(h1[4], h1[8]); // Thumb tip to Index tip
            g.isPinching = pinchDist < 0.05;

            // 2. Fist Detection
            // Check if fingertips [8,12,16,20] are close to wrist [0]
            let tipSum = 0;
            [8,12,16,20].forEach(i => tipSum += dist(h1[i], h1[0]));
            const avgTipDist = tipSum / 4;
            g.isFist = avgTipDist < 0.25; // Threshold for fist

            // 3. Palm Open
            g.isPalmOpen = !g.isFist && !g.isPinching && avgTipDist > 0.4;

            // 4. Victory / Peace Sign
            // Index & Middle extended, Ring & Pinky curled
            const ringDist = dist(h1[16], h1[0]);
            const pinkyDist = dist(h1[20], h1[0]);
            const indexDist = dist(h1[8], h1[0]);
            const middleDist = dist(h1[12], h1[0]);
            g.isVictory = indexDist > 0.4 && middleDist > 0.4 && ringDist < 0.3 && pinkyDist < 0.3;

            // 5. Punch Detection (Velocity based)
            // Calculate Z-velocity of wrist
            const currentZ = h1[0].z; // Raw depth
            const deltaZ = currentZ - physicsRef.current.prevWristZ;
            // Negative deltaZ means moving AWAY from camera (into screen)? 
            // Actually usually smaller Z = closer in MediaPipe raw. 
            // Let's use simple speed
            physicsRef.current.punchVelocity = Math.abs(deltaZ);
            g.isPunching = physicsRef.current.punchVelocity > 0.1 && g.isFist;
            physicsRef.current.prevWristZ = currentZ;

            // 6. Two Hands Interaction
            g.isClapping = false;
            g.isTwoHandSmash = false;
            
            if (g.handsCount === 2) {
                const h2 = landmarks[1];
                const h1Wrist = h1[0];
                const h2Wrist = h2[0];
                const handDist = dist(h1Wrist, h2Wrist);
                g.handsDistance = handDist;

                // Clap: Hands very close + palms facing (simplified to dist)
                if (handDist < 0.1) {
                    g.isClapping = true;
                }

                // Two Hand Smash: Two fists close together
                // Check if both are fists (need to calc h2 fist status)
                let h2TipSum = 0;
                [8,12,16,20].forEach(i => h2TipSum += dist(h2[i], h2[0]));
                const isH2Fist = (h2TipSum/4) < 0.25;

                if (g.isFist && isH2Fist && handDist < 0.15) {
                    g.isTwoHandSmash = true;
                }
            }

            // 7. Snap Detection (Approximate)
            // Thumb touching Middle finger, Index extended
            const middleThumbDist = dist(h1[12], h1[4]);
            g.isSnapping = middleThumbDist < 0.04 && dist(h1[8], h1[0]) > 0.4;

            // --- SET GESTURE NAME FOR HUD ---
            if (g.isClapping) g.gestureName = "CLAP (MODE SWITCH)";
            else if (g.isTwoHandSmash) g.gestureName = "SMASH (RESET)";
            else if (g.isSnapping) g.gestureName = "SNAP (COLOR)";
            else if (g.isVictory) g.gestureName = "VICTORY (FREEZE)";
            else if (g.isPunching) g.gestureName = "PUNCH (ZOOM)";
            else if (g.isFist) g.gestureName = "FIST (GRAB)";
            else if (g.isPinching) g.gestureName = "PINCH (DRAG)";
            else if (g.isPalmOpen) g.gestureName = "PALM (HOVER)";
            else g.gestureName = "TRACKING...";

          } else {
              g.gestureName = "NO HANDS";
          }
        });
        handsRef.current = hands;
    }

    const startCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: {ideal:640}, height: {ideal:480}, facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    processVideoFrame();
                };
            }
        } catch (e) { 
            console.warn("Camera access denied or unavailable", e);
        }
    };

    const processVideoFrame = async () => {
        if (!interactiveMode) return; 
        if (videoRef.current?.readyState >= 2 && handsRef.current) {
            try {
                await handsRef.current.send({ image: videoRef.current });
            } catch (err) { }
        }
        if (interactiveMode) videoRequestRef.current = requestAnimationFrame(processVideoFrame);
    };

    startCamera();

    return () => {
        cancelAnimationFrame(videoRequestRef.current);
    };
  }, [interactiveMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-black overflow-hidden">
       <canvas ref={canvasRef} className="w-full h-full block" />
       <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
});
FractalVis.displayName = 'FractalVis';
