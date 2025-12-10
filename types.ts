
export enum FractalMode {
  MANDELBULB_3D = '3D',
  JULIA_2D = '2D',
  MANDELBROT = 'MANDELBROT',
  TRICORN = 'TRICORN',
  BURNING_SHIP = 'BURNING_SHIP',
  MENGER_SPONGE = 'MENGER_SPONGE',
  SIERPINSKI = 'SIERPINSKI'
}

export enum InteractionMode {
  OBJECT_ORBIT = 'OBJECT_ORBIT', // Rotates around the fractal like an object
  IMMERSIVE_FLY = 'IMMERSIVE_FLY' // Zooms into and flies through the fractal
}

export type AnimationPreset = 
  | 'NONE'
  | 'MANDELBROT_DIVE'
  | 'JULIA_MORPH'
  | 'UNIVERSE_TOUR'
  | 'GEOMETRIC_PATTERNS'
  | 'COLOR_SYMPHONY'
  | 'INFINITY_ZOOM';

export interface FractalParams {
  power: number; 
  zoom: number;
  juliaC: { x: number; y: number }; 
  attractionStrength: number;
  repulsionStrength: number;
  colorShift: number;
}

export interface HandGestures {
  // Positional
  indexTip: { x: number; y: number; z: number }; 
  wristPos: { x: number; y: number; z: number };
  
  // Basic States
  isPinching: boolean;
  isPalmOpen: boolean;
  isFist: boolean; 
  isPointing: boolean;
  isVictory: boolean; // Peace sign

  // Complex Actions
  isClapping: boolean; 
  isPunching: boolean; // Fast Z-movement
  isTwoHandSmash: boolean; // Two fists close together
  isSnapping: boolean; 
  
  // Metadata
  handsDistance: number; // Distance between two hands if present
  handsCount: number;
  gestureName: string; // For HUD display
}
