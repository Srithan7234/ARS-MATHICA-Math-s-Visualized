import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export type ArtPatternType = 
  | 'FRACTAL_TREE' 
  | 'BINARY_TREE' 
  | 'PYTHAGORAS_TREE' 
  | 'FRACTAL_BUSH'
  | 'KOCH_SNOWFLAKE' 
  | 'SIERPINSKI_TRIANGLE' 
  | 'DRAGON_CURVE'
  | 'LEVY_C_CURVE'
  | 'SIERPINSKI_CARPET'
  | 'CANTOR_SET'
  | 'FRACTAL_LIGHTNING'
  | 'CORAL_BRANCHING'
  | 'ALGAE_L_SYSTEM'
  | 'FLOWER_FRACTAL';

export type ColorScheme = 'COSMIC' | 'FIRE' | 'OCEAN' | 'RAINBOW' | 'FOREST';

interface AlgorithmicArtProps {
  pattern: ArtPatternType;
  depth: number;
  angle: number;
  ratio: number;
  randomness: number;
  animate: boolean;
  colorScheme: ColorScheme;
}

export interface AlgorithmicArtRef {
  captureImage: () => string;
}

export const AlgorithmicArt = forwardRef<AlgorithmicArtRef, AlgorithmicArtProps>(({
  pattern, depth, angle, ratio, randomness, animate, colorScheme
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const seedRef = useRef<number>(Math.random());

  useImperativeHandle(ref, () => ({
    captureImage: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL("image/png");
      }
      return "";
    }
  }));

  // Color Utility
  const getColor = (step: number, totalSteps: number, variant: number = 0): string => {
    const t = Math.max(0, Math.min(1, step / totalSteps));
    const noise = variant * 20;
    // Increased lightness range (60-80%) for better visibility of strokes against black
    switch (colorScheme) {
      case 'COSMIC': // Purple/Cyan/Blue
        return `hsl(${240 + t * 60 + noise}, ${70 + t * 30}%, ${70 - t * 20}%)`; 
      case 'FIRE': // Red/Orange/Yellow
        return `hsl(${10 + t * 50 + noise}, 100%, ${60 + t * 20}%)`;
      case 'OCEAN': // Deep Blue/Teal
        return `hsl(${200 + t * 40 + noise}, 80%, ${60 + t * 20}%)`;
      case 'FOREST': // Green/Brown
        return `hsl(${100 - t * 60 + noise}, 60%, ${50 + t * 30}%)`;
      case 'RAINBOW':
        return `hsl(${t * 360 + noise}, 80%, 70%)`;
      default:
        return '#fff';
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // --- Drawing Algorithms ---

    const drawTree = (x: number, y: number, len: number, orientation: number, d: number, branchCount: number = 2, spread: number = 1, isLightning: boolean = false, branchAngle: number = 25) => {
      ctx.beginPath();
      ctx.save();
      ctx.strokeStyle = getColor(depth - d, depth);
      ctx.lineWidth = d > 2 ? d * 0.8 : 1;
      if (isLightning) ctx.lineWidth = d * 0.5 + Math.random();
      
      ctx.translate(x, y);
      ctx.rotate(orientation * Math.PI / 180);
      
      // Draw Limb
      if (isLightning) {
          // Jagged line
          let cy = 0;
          ctx.moveTo(0,0);
          const segments = 5;
          for(let i=0; i<segments; i++) {
              cy -= len/segments;
              ctx.lineTo((Math.random()-0.5)*10 * randomness, cy);
          }
      } else {
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -len);
      }
      ctx.stroke();

      if (d > 0) {
        // Translate to end of limb
        ctx.translate(0, -len);
        
        const rLen = 1.0 + randomness * (Math.random() - 0.5) * 0.5;
        
        if (isLightning) {
             // Single path mostly, rare branching
             const randAngle = (Math.random() - 0.5) * branchAngle * 2;
             drawTree(0, 0, len * ratio * rLen, randAngle, d - 1, branchCount, spread, true, branchAngle);
             if (Math.random() > 0.6) {
                 drawTree(0, 0, len * ratio * 0.6, randAngle + 45, d - 1, branchCount, spread, true, branchAngle);
             }
        } else {
            // Standard branching
            const startAngle = -branchAngle * (spread / 2);
            const stepAngle = branchAngle * spread / (branchCount > 1 ? branchCount - 1 : 1);

            for (let i = 0; i < branchCount; i++) {
                 // For binary tree (2 branches), spread them evenly around 0
                 // If spread is 1, angles are -angle/2 and +angle/2
                 const baseAng = branchCount === 1 ? (Math.random()-0.5)*branchAngle : startAngle + (i * stepAngle);
                 const rAngle = randomness * (Math.random() - 0.5) * 30;
                 drawTree(0, 0, len * ratio * rLen, baseAng + rAngle, d - 1, branchCount, spread, isLightning, branchAngle);
            }
        }
      }
      ctx.restore();
    };

    // Robust Pythagoras Re-implementation
    const drawPythagorasRobust = (x: number, y: number, w: number, ang: number, d: number, spreadAngle: number) => {
        if (d <= 0) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        
        // Use Stroke for outlines
        ctx.strokeStyle = getColor(depth - d, depth);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-w/2, -w, w, w);
        
        if (d > 1) {
            const r = spreadAngle * Math.PI / 180;
            const s1 = w * ratio * 0.8; 
            
            // Left Branch
            ctx.save();
            ctx.translate(0, -w);
            ctx.rotate(-r);
            drawPythagorasRobust(-w/4, 0, s1, 0, d-1, spreadAngle);
            ctx.restore();

            // Right Branch
            ctx.save();
            ctx.translate(0, -w);
            ctx.rotate(r);
            drawPythagorasRobust(w/4, 0, s1, 0, d-1, spreadAngle);
            ctx.restore();
        }
        ctx.restore();
    };


    const drawKoch = (p1: {x: number, y: number}, p2: {x: number, y: number}, d: number) => {
        if (d === 0) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            return;
        }
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const unit = dist / 3;
        const ang = Math.atan2(dy, dx);
        const pA = { x: p1.x + dx/3, y: p1.y + dy/3 };
        const pC = { x: p1.x + 2*dx/3, y: p1.y + 2*dy/3 };
        const pB = {
            x: pA.x + Math.cos(ang - Math.PI/3) * unit,
            y: pA.y + Math.sin(ang - Math.PI/3) * unit
        };
        drawKoch(p1, pA, d-1);
        drawKoch(pA, pB, d-1);
        drawKoch(pB, pC, d-1);
        drawKoch(pC, p2, d-1);
    };

    const drawSierpinski = (p1: {x:number, y:number}, p2: {x:number, y:number}, p3: {x:number, y:number}, d: number) => {
        if (d === 0) {
            ctx.strokeStyle = getColor(depth, depth);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.stroke();
            return;
        }
        const pA = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
        const pB = { x: (p2.x + p3.x)/2, y: (p2.y + p3.y)/2 };
        const pC = { x: (p3.x + p1.x)/2, y: (p3.y + p1.y)/2 };
        drawSierpinski(p1, pA, pC, d-1);
        drawSierpinski(pA, p2, pB, d-1);
        drawSierpinski(pC, pB, p3, d-1);
    };

    const drawSierpinskiCarpet = (x: number, y: number, size: number, d: number) => {
        if (d <= 0) {
            ctx.strokeStyle = getColor(depth, depth);
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, size, size);
            return;
        }
        const newSize = size / 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (i === 1 && j === 1) {
                    // Hole
                } else {
                    drawSierpinskiCarpet(x + i * newSize, y + j * newSize, newSize, d - 1);
                }
            }
        }
    };

    const drawCantor = (x: number, y: number, len: number, d: number) => {
        if (d <= 0) {
             ctx.strokeStyle = getColor(depth, depth);
             ctx.lineWidth = 2;
             ctx.strokeRect(x, y, len, 10);
             return;
        }
        ctx.strokeStyle = getColor(depth, depth);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, len, 4); // Stroke the bar instead of fill
        
        const newLen = len / 3;
        drawCantor(x, y + 20, newLen, d - 1);
        drawCantor(x + 2 * newLen, y + 20, newLen, d - 1);
    };

    // Generic L-System Renderer
    const drawLSystem = (iterations: number, axiom: string, rules: {[key:string]: string}, theta: number, len: number, startX: number, startY: number, startAngle: number) => {
        let sentence = axiom;
        const maxIter = Math.min(iterations, 14); // Safety cap
        for (let i = 0; i < maxIter; i++) {
            let nextSentence = "";
            for (let j = 0; j < sentence.length; j++) {
                const char = sentence[j];
                nextSentence += rules[char] || char;
            }
            sentence = nextSentence;
        }

        ctx.strokeStyle = getColor(0, 1);
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        let x = startX;
        let y = startY;
        let dir = startAngle * Math.PI / 180;
        const stack: {x:number, y:number, dir:number}[] = [];

        ctx.moveTo(x, y);

        for (let i = 0; i < sentence.length; i++) {
            const char = sentence[i];
            if (char === 'F' || char === 'G') {
                x += Math.cos(dir) * len;
                y += Math.sin(dir) * len;
                ctx.lineTo(x, y);
            } else if (char === '+') {
                dir += theta * Math.PI / 180;
            } else if (char === '-') {
                dir -= theta * Math.PI / 180;
            } else if (char === '[') {
                stack.push({x, y, dir});
            } else if (char === ']') {
                const state = stack.pop();
                if (state) {
                    x = state.x;
                    y = state.y;
                    dir = state.dir;
                    ctx.moveTo(x, y);
                }
            }
        }
        ctx.stroke();
    };

    // Flower / Mandala Generator
    const drawFlower = (x: number, y: number, radius: number, d: number) => {
         const petals = 6 + Math.floor(randomness * 6);
         const slice = (Math.PI * 2) / petals;
         
         ctx.translate(x, y);
         for(let i=0; i<petals; i++) {
             ctx.save();
             ctx.rotate(i * slice);
             ctx.strokeStyle = getColor(i, petals);
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             ctx.ellipse(radius/2, 0, radius/2, radius/4, 0, 0, Math.PI * 2);
             ctx.stroke();
             
             if (d > 1) {
                 ctx.translate(radius, 0);
                 ctx.scale(ratio, ratio);
                 ctx.strokeStyle = getColor(d, depth);
                 ctx.beginPath();
                 ctx.arc(0, 0, radius * 0.5, 0, Math.PI*2);
                 ctx.stroke();
             }
             ctx.restore();
         }
         ctx.translate(-x, -y);
    };

    // --- Render Loop ---
    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      
      // Background
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
      gradient.addColorStop(0, '#000000'); // Force Black
      gradient.addColorStop(1, '#000000'); // Force Black
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // --- Animation Parameters ---
      let effectiveAngle = angle;
      let effectiveRatio = ratio;
      let rotationOffset = 0;
      let scalePulse = 1.0;
      let sway = 0;

      if (animate) {
          // Tree Sway & Breathing
          if (pattern.includes('TREE') || pattern.includes('BUSH') || pattern.includes('CORAL') || pattern.includes('PYTHAGORAS') || pattern.includes('ALGAE')) {
              sway = Math.sin(time * 0.001) * 3;
              effectiveAngle = angle + Math.sin(time * 0.0015) * 5;
              effectiveRatio = ratio + Math.sin(time * 0.002) * 0.02;
          }
          // Geometric Rotate
          if (pattern.includes('SIERPINSKI') || pattern.includes('KOCH') || pattern.includes('FLOWER')) {
              rotationOffset = time * 0.0005;
          }
          // Pulse
          if (pattern.includes('DRAGON') || pattern.includes('LEVY') || pattern.includes('CANTOR')) {
              scalePulse = 1.0 + Math.sin(time * 0.001) * 0.05;
          }
          // Lightning Jitter
          if (pattern === 'FRACTAL_LIGHTNING') {
              seedRef.current = Math.random(); // Chaotic jitter
          }
      }

      ctx.save();
      
      // Center geometric shapes
      if (rotationOffset !== 0 || scalePulse !== 1.0) {
          ctx.translate(width/2, height/2);
          ctx.rotate(rotationOffset);
          ctx.scale(scalePulse, scalePulse);
          ctx.translate(-width/2, -height/2);
      }

      // Draw Pattern
      switch (pattern) {
          case 'FRACTAL_TREE':
              drawTree(width/2, height, height * 0.25, sway, depth, 2, 1, false, effectiveAngle);
              break;
          case 'BINARY_TREE':
              drawTree(width/2, height, height * 0.2, sway, depth, 2, 1.5, false, effectiveAngle);
              break;
          case 'FRACTAL_BUSH':
              drawTree(width/2, height, height * 0.2, sway, Math.max(1, depth - 2), 4, 2, false, effectiveAngle);
              break;
          case 'CORAL_BRANCHING':
               drawTree(width/2, height, height * 0.2, sway, depth, 2, 1.2, false, effectiveAngle);
               // Add extra random organic layer
               ctx.globalAlpha = 0.5;
               drawTree(width/2, height, height * 0.15, sway + 10, Math.max(1, depth - 2), 3, 2, false, effectiveAngle);
               ctx.globalAlpha = 1.0;
               break;
          case 'FRACTAL_LIGHTNING':
              drawTree(width/2, 0, height * 0.3, 180 + sway, depth + 2, 1, 1, true, effectiveAngle); // Draw from top down
              break;
          case 'PYTHAGORAS_TREE':
              drawPythagorasRobust(width/2, height - 50, 80, sway * Math.PI/180, Math.min(depth, 10), effectiveAngle); 
              break;
          case 'KOCH_SNOWFLAKE': {
              ctx.strokeStyle = getColor(1, 1);
              const size = Math.min(width, height) * 0.8;
              const h = size * Math.sqrt(3) / 2;
              const p1 = { x: width/2 - size/2, y: height/2 + h/3 };
              const p2 = { x: width/2 + size/2, y: height/2 + h/3 };
              const p3 = { x: width/2, y: height/2 - 2*h/3 };
              const kDepth = Math.min(depth, 6);
              drawKoch(p1, p3, kDepth);
              drawKoch(p3, p2, kDepth);
              drawKoch(p2, p1, kDepth);
              break;
          }
          case 'SIERPINSKI_TRIANGLE': {
              const size = Math.min(width, height) * 0.9;
              const h = size * Math.sqrt(3) / 2;
              const p1 = { x: width/2, y: (height - h)/2 };
              const p2 = { x: width/2 - size/2, y: (height + h)/2 };
              const p3 = { x: width/2 + size/2, y: (height + h)/2 };
              drawSierpinski(p1, p2, p3, Math.min(depth, 8));
              break;
          }
          case 'SIERPINSKI_CARPET':
              const size = Math.min(width, height) * 0.8;
              drawSierpinskiCarpet(width/2 - size/2, height/2 - size/2, size, Math.min(depth, 6));
              break;
          case 'CANTOR_SET':
              drawCantor(50, height/2 - 50, width - 100, depth);
              break;
          case 'DRAGON_CURVE':
              // Dragon Curve: FX, X -> X+YF+, Y -> -FX-Y
              drawLSystem(Math.min(depth, 14), "FX", { "X": "X+YF+", "Y": "-FX-Y" }, 90, 5 + (14-Math.min(depth,14))*2, width/2, height/2, 0);
              break;
          case 'LEVY_C_CURVE':
              // Levy C: F -> +F--F+
              drawLSystem(Math.min(depth, 12), "F", { "F": "+F--F+" }, 45, 5 + (12-Math.min(depth,12))*3, width/2 - 100, height/2 - 100, 0);
              break;
          case 'ALGAE_L_SYSTEM':
               // Plant: F -> FF-[-F+F+F]+[+F-F-F]
               drawLSystem(Math.min(depth, 5), "F", {"F": "FF-[-F+F+F]+[+F-F-F]"}, effectiveAngle, 10 + (5-Math.min(depth,5))*5, width/2, height, -90);
               break;
          case 'FLOWER_FRACTAL':
              drawFlower(width/2, height/2, 200 * ratio, depth);
              break;
          default:
              break;
      }
      
      ctx.restore();

      requestRef.current = requestAnimationFrame(() => render(time + 16));
    };

    requestRef.current = requestAnimationFrame(() => render(0));

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [pattern, depth, angle, ratio, randomness, animate, colorScheme]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
});
AlgorithmicArt.displayName = 'AlgorithmicArt';