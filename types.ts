export enum FractalMode {
  MANDELBULB_3D = '3D',
  JULIA_2D = '2D',
  MANDELBROT = 'MANDELBROT',
  TRICORN = 'TRICORN',
  BURNING_SHIP = 'BURNING_SHIP',
  MENGER_SPONGE = 'MENGER_SPONGE',
  SIERPINSKI = 'SIERPINSKI'
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
  indexTip: { x: number; y: number; z: number }; 
  isPinching: boolean;
  pinchDistance: number;
  isPalmOpen: boolean;
  isFist: boolean; 
  isSnapping: boolean; 
  isWaving: boolean; 
  isStopped: boolean; 
  wristRotation: number; 
  isVisible: boolean;
  isClapping: boolean; 
  handsDistance: number;
}