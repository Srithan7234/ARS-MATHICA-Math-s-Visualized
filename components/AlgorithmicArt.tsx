import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export type ArtPatternType = 'FRACTAL_TREE' | 'PYTHAGORAS_TREE' | 'KOCH_SNOWFLAKE' | 'SIERPINSKI_TRIANGLE' | 'BINARY_TREE';
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
  const timeRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    captureImage: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL("image/png");
      }
      return "";
    }
  }));

  // Color Utility
  const getColor = (step: number, totalSteps: number): string => {
    const t = step / totalSteps;
    
    switch (colorScheme) {
      case 'COSMIC': // Purple/Cyan/Blue
        return `hsl(${240 + t * 60}, ${70 + t * 30}%, ${60 - t * 20}%)`; // Blue -> Purple
      case 'FIRE': // Red/Orange/Yellow
        return `hsl(${10 + t * 50}, 100%, ${50 + t * 20}%)`;
      case 'OCEAN': // Deep Blue/Teal
        return `hsl(${200 + t * 40}, 80%, ${40 + t * 30}%)`;
      case 'FOREST': // Green/Brown
        return `hsl(${100 - t * 60}, 60%, ${30 + t * 40}%)`; // Green -> Brown
      case 'RAINBOW':
        return `hsl(${t * 360}, 80%, 60%)`;
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
    
    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // --- Drawing Algorithms ---

    const drawTree = (x: number, y: number, len: number, ang: number, d: number) => {
      ctx.beginPath();
      ctx.save();
      ctx.strokeStyle = getColor(depth - d, depth);
      ctx.lineWidth = d > 2 ? d * 0.8 : 1;
      ctx.translate(x, y);
      ctx.rotate(ang * Math.PI / 180);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.stroke();

      if (d > 0) {
        // Randomness factor
        const rAngle = randomness * (Math.random() - 0.5) * 30;
        const rLen = 1.0 + randomness * (Math.random() - 0.5) * 0.2;

        drawTree(0, -len, len * ratio * rLen, angle + rAngle, d - 1);
        drawTree(0, -len, len * ratio * rLen, -angle + rAngle, d - 1);
      }
      ctx.restore();
    };

    const drawPythagoras = (x: number, y: number, side: number, ang: number, d: number) => {
        if (d <= 0) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang * Math.PI / 180);
        ctx.fillStyle = getColor(depth - d, depth);
        
        // Draw square
        ctx.fillRect(-side/2, -side, side, side);

        const nextSide = side * (Math.cos(angle * Math.PI / 180)); // simplified ratio logic based on angle
        
        // Basic recursive square logic (simplified Pythagoras tree)
        if (d > 1) {
            // Left branch
            ctx.save();
            ctx.translate(-side/4, -side);
            ctx.rotate(-angle * Math.PI/180);
            drawPythagoras(0, 0, side * ratio, 0, d - 1);
            ctx.restore();

            // Right branch
            ctx.save();
            ctx.translate(side/4, -side);
            ctx.rotate(angle * Math.PI/180);
            drawPythagoras(0, 0, side * ratio, 0, d - 1);
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

        // Calculate points
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
            ctx.fillStyle = getColor(depth, depth); // Solid color for base
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.fill();
            return;
        }

        const pA = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
        const pB = { x: (p2.x + p3.x)/2, y: (p2.y + p3.y)/2 };
        const pC = { x: (p3.x + p1.x)/2, y: (p3.y + p1.y)/2 };

        drawSierpinski(p1, pA, pC, d-1);
        drawSierpinski(pA, p2, pB, d-1);
        drawSierpinski(pC, pB, p3, d-1);
    };

    // --- Render Loop ---
    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      
      // Background gradient
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
      gradient.addColorStop(0, '#0a0a12');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Animation factor
      let animAngle = angle;
      if (animate) {
          animAngle = angle + Math.sin(time * 0.001) * 5;
      }
      
      // Determine what to draw
      if (pattern === 'FRACTAL_TREE') {
          drawTree(width/2, height, height * 0.25, 0, depth);
      } else if (pattern === 'PYTHAGORAS_TREE') {
          drawPythagoras(width/2, height - 50, 80, 0, Math.min(depth, 10)); // Limit depth for rendering Perf
      } else if (pattern === 'KOCH_SNOWFLAKE') {
          ctx.strokeStyle = getColor(1, 1);
          ctx.lineWidth = 1;
          // Triangle base
          const size = Math.min(width, height) * 0.8;
          const h = size * Math.sqrt(3) / 2;
          const p1 = { x: width/2 - size/2, y: height/2 + h/3 };
          const p2 = { x: width/2 + size/2, y: height/2 + h/3 };
          const p3 = { x: width/2, y: height/2 - 2*h/3 };
          
          const kDepth = Math.min(depth, 6); // Performance limit
          drawKoch(p1, p3, kDepth);
          drawKoch(p3, p2, kDepth);
          drawKoch(p2, p1, kDepth);
      } else if (pattern === 'SIERPINSKI_TRIANGLE') {
          const size = Math.min(width, height) * 0.9;
          const h = size * Math.sqrt(3) / 2;
          const p1 = { x: width/2, y: 50 };
          const p2 = { x: width/2 - size/2, y: 50 + h };
          const p3 = { x: width/2 + size/2, y: 50 + h };
          drawSierpinski(p1, p2, p3, Math.min(depth, 8));
      } else if (pattern === 'BINARY_TREE') {
          // Simple Binary Tree
           drawTree(width/2, height, height * 0.2, 0, depth);
      }
      
      if (animate) {
         requestRef.current = requestAnimationFrame(render);
      }
    };

    if (animate) {
       requestRef.current = requestAnimationFrame(render);
    } else {
       render(0);
    }

    return () => {
       if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

  }, [pattern, depth, angle, ratio, randomness, animate, colorScheme]);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

AlgorithmicArt.displayName = "AlgorithmicArt";