
export const vertexShader = `
uniform float uTime;
uniform float uMode; // 0=3D, 1=Julia, 2=Mandelbrot, 3=Tricorn, 4=BurningShip, 5=MengerSponge, 6=Sierpinski
uniform vec3 uHandPos; // World space
uniform float uAttractStrength;
uniform float uRepelStrength;
uniform float uPower; // Fractal power
uniform vec2 uJuliaC; // C parameter for Julia
uniform float uPinchScale;
uniform float uExplosion; // 0.0 to 1.0 based on clapping
uniform float uChaos; // 0.0 to 1.0 based on fist/punch
uniform float uSnap; // 0.0 to 1.0 based on snapping fingers
uniform float uMaxIter; // Controlled by Advanced Settings
uniform float uVisualMode; // 1.0 if purely visual (static bg), 0.0 if interactive
uniform float uColorMode; // 0=Cosmic, 1=Magma, 2=Aqua, 3=Matrix, 4=Cyberpunk

// Navigation Uniforms
uniform float uZoom;
uniform vec2 uPan;

attribute float aSize;
attribute vec3 aRandom; // Random seed per particle

varying vec3 vColor;
varying float vAlpha;

// --- FRACTAL MATH ---

// 3D Mandelbulb
float DE_Mandelbulb(vec3 p, float power) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < 8; i++) { 
        r = length(z);
        if (r > 2.0) break;
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        float zr = pow(r, power);
        theta = theta * power + uTime * 0.1;
        phi = phi * power + uTime * 0.05;
        z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
        z += p;
    }
    return 0.5 * log(r) * r / dr;
}

// 3D Menger Sponge
float DE_MengerSponge(vec3 p) {
    float d = length(max(abs(p) - vec3(1.0), 0.0));
    float s = 1.0;
    for(int i=0; i<4; i++) {
        vec3 a = mod(p * s, 2.0) - 1.0;
        s *= 3.0;
        vec3 r = abs(1.0 - 3.0 * abs(a));
        float da = max(r.x, r.y);
        float db = max(r.y, r.z);
        float dc = max(r.z, r.x);
        float c = (min(da, min(db, dc)) - 1.0) / s;
        d = max(d, c);
    }
    return d;
}

// 3D Sierpinski Tetrahedron
float DE_Sierpinski(vec3 p) {
    vec3 a1 = vec3(1.0, 1.0, 1.0);
    vec3 a2 = vec3(-1.0, -1.0, 1.0);
    vec3 a3 = vec3(1.0, -1.0, -1.0);
    vec3 a4 = vec3(-1.0, 1.0, -1.0);
    vec3 c;
    float dist, d;
    int n = 0;
    p = p * 1.5;
    while (n < 8) {
         c = a1; dist = length(p-a1);
         d = length(p-a2); if (d < dist) { c = a2; dist=d; }
         d = length(p-a3); if (d < dist) { c = a3; dist=d; }
         d = length(p-a4); if (d < dist) { c = a4; dist=d; }
         p = 2.0 * p - c;
         n++;
    }
    return length(p) * pow(2.0, -float(n));
}

vec2 csqr(vec2 a) { return vec2(a.x*a.x - a.y*a.y, 2.0*a.x*a.y); }

// Iterators
vec3 IterateFractal(vec2 pos, float mode) {
    vec2 z = vec2(0.0);
    vec2 c = vec2(0.0);
    
    // pos is already transformed by pan/zoom in main()
    vec2 uv = pos; 
    
    bool isJulia = (abs(mode - 1.0) < 0.1);
    
    if (isJulia) {
        z = uv;
        c = uJuliaC;
    } else {
        z = vec2(0.0); 
        c = uv; 
    }

    float iter = 0.0;
    
    float loopLimit = uMaxIter > 0.0 ? uMaxIter : 20.0;

    for (float i = 0.0; i < 100.0; i++) {
        if (i >= loopLimit) break;
        
        if (mode < 2.5) { 
            // Mandelbrot/Julia
            z = csqr(z) + c;
        } else if (abs(mode - 3.0) < 0.1) {
            // Tricorn
            vec2 zConj = vec2(z.x, -z.y);
            z = csqr(zConj) + c;
        } else {
            // Burning Ship
            vec2 zAbs = vec2(abs(z.x), abs(z.y));
            z = csqr(zAbs) + c;
        }

        if (dot(z, z) > 4.0) {
            break;
        }
        iter++;
    }
    
    float smoothIter = iter - log2(log2(dot(z,z))) + 4.0;
    return vec3(z.x, z.y, smoothIter / loopLimit);
}

// Color Palette Function
vec3 getPalette(float t, float mode) {
    vec3 c1, c2, c3;
    float pulse = 0.5 + 0.5 * sin(t * 3.0 + uTime * 0.1);
    if (uVisualMode > 0.5) pulse = 0.5 + 0.5 * sin(t * 3.0);

    // Cosmic (Default)
    if (mode < 0.5) {
        c1 = vec3(0.02, 0.01, 0.10); // Indigo
        c2 = vec3(0.15, 0.05, 0.25); // Plum
        c3 = vec3(0.30, 0.20, 0.50); // Lavender
        vec3 col = mix(c1, c2, pulse);
        return mix(col, c3, pow(pulse, 4.0) * 0.4); 
    } 
    // Magma
    else if (mode < 1.5) {
         c1 = vec3(0.1, 0.0, 0.0); // Dark Red
         c2 = vec3(0.6, 0.1, 0.0); // Red Orange
         c3 = vec3(1.0, 0.7, 0.1); // Bright Yellow
         vec3 col = mix(c1, c2, pulse);
         return mix(col, c3, pow(pulse, 3.0));
    }
    // Aqua
    else if (mode < 2.5) {
         c1 = vec3(0.0, 0.1, 0.2); // Dark Blue
         c2 = vec3(0.0, 0.4, 0.6); // Cyan
         c3 = vec3(0.6, 0.9, 1.0); // White Cyan
         vec3 col = mix(c1, c2, pulse);
         return mix(col, c3, pow(pulse, 5.0) * 0.5);
    }
    // Matrix / Toxic
    else if (mode < 3.5) {
         c1 = vec3(0.0, 0.1, 0.0); // Dark Green
         c2 = vec3(0.1, 0.4, 0.1); // Green
         c3 = vec3(0.4, 1.0, 0.4); // Bright Green
         vec3 col = mix(c1, c2, pulse);
         return mix(col, c3, pow(pulse, 8.0) * 0.8);
    }
    // Cyberpunk
    else {
         c1 = vec3(0.15, 0.0, 0.3); // Deep Purple
         c2 = vec3(0.0, 0.2, 0.5); // Blue
         c3 = vec3(1.0, 0.0, 0.8); // Neon Pink
         vec3 col = mix(c1, c2, pulse);
         return mix(col, c3, pow(pulse, 2.0) * 0.5);
    }
}

void main() {
    vec3 originalPos = position;
    vec3 targetPos = originalPos;
    float mode = uMode;
    
    // --- 3D Calculation ---
    vec3 pos3D = originalPos;
    if (mode < 0.5) {
        // Mandelbulb
        float dist = DE_Mandelbulb(normalize(originalPos) * 1.2, uPower);
        pos3D = normalize(originalPos) * (1.2 - dist); 
    } else if (mode > 4.5 && mode < 5.5) {
        // Menger
        float dist = DE_MengerSponge(originalPos * 1.5);
        pos3D = normalize(originalPos) * (1.5 - dist) * 1.2;
    } else if (mode > 5.5) {
        // Sierpinski
        float dist = DE_Sierpinski(originalPos * 1.5);
        pos3D = normalize(originalPos) * (1.5 - dist) * 1.0;
    }
    
    // --- 2D Calculation ---
    vec3 fractalResult = vec3(0.0);
    vec3 pos2D = vec3(0.0);
    
    if (mode >= 0.5 && mode <= 4.5) {
         // Flatten and apply navigation
         vec2 flatPos = originalPos.xy * 2.0;
         
         // Apply Zoom and Pan
         vec2 navPos = (flatPos / uZoom) + uPan;
         
         fractalResult = IterateFractal(navPos, mode);
         
         float zDepth = (fractalResult.z) * 0.5; 
         
         // Visual cleanup for 2D mode
         if (fractalResult.z < 0.05) {
            flatPos *= 6.0; 
            zDepth = -20.0;
         }
         
         pos2D = vec3(originalPos.x * 4.0, originalPos.y * 3.0, zDepth * 3.0);
    }
    
    // Switcher
    if (mode < 0.5 || mode > 4.5) {
        targetPos = pos3D;
    } else {
        targetPos = pos2D;
    }
    
    // --- INTERACTIONS ---
    if (uVisualMode < 0.5) {
        // Only apply chaotic distortions in interactive mode
        if (uChaos > 0.05) {
            targetPos.x += sin(targetPos.y * 20.0 + uTime * 50.0) * uChaos * 0.5;
            targetPos.y += cos(targetPos.z * 20.0 + uTime * 50.0) * uChaos * 0.5;
            targetPos.z += sin(targetPos.x * 20.0 + uTime * 50.0) * uChaos * 0.5;
        }
        if (uExplosion > 0.05) {
            vec3 explodeDir = normalize(originalPos + vec3(0.001));
            targetPos += explodeDir * uExplosion * 30.0 * (0.5 + aRandom.x);
        }
        if (uSnap > 0.05) {
            float ripple = sin(length(originalPos) * 10.0 - uTime * 20.0);
            targetPos += normalize(originalPos) * ripple * uSnap * 0.8;
        }
        
        float dHand = distance(targetPos, uHandPos);
        if (uAttractStrength > 0.0 && dHand < 4.0) {
            vec3 dir = normalize(uHandPos - targetPos);
            float force = (1.0 - smoothstep(0.0, 4.0, dHand)) * uAttractStrength * 2.0;
            targetPos += dir * force;
        }
        if (uRepelStrength > 0.0 && dHand < 6.0) {
            vec3 dir = normalize(targetPos - uHandPos);
            float force = (1.0 - smoothstep(0.0, 6.0, dHand)) * uRepelStrength * 3.0;
            targetPos += dir * force;
        }
        
        targetPos *= (1.0 + uPinchScale * 0.3);
    }

    vec4 mvPosition = modelViewMatrix * vec4(targetPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    float sizeMod = aSize;
    if (uVisualMode < 0.5) {
        sizeMod *= (1.0 + uPinchScale + uExplosion * 4.0 + uChaos * 2.0 + uSnap * 2.0);
    }
    
    gl_PointSize = sizeMod * (120.0 / -mvPosition.z);
    
    // Color
    float t = fractalResult.z + uTime * 0.05 + aRandom.x * 0.2;
    if (mode < 0.5 || mode > 4.5) {
        t = length(targetPos) * 0.2 + uTime * 0.1;
    }
    
    vec3 color = getPalette(t, uColorMode);
    vec3 darkBase = vec3(0.0, 0.0, 0.02); 
    
    // In visual mode, remove background particles to clean up view
    if (uVisualMode > 0.5) {
        if (fractalResult.z < 0.05 && mode >= 0.5 && mode <= 4.5) {
             vAlpha = 0.0; // Hide background in 2D visual mode
        } else {
             vAlpha = 0.8;
        }
        vColor = color;
    } else {
        vColor = mix(darkBase, color, 0.6);
        vColor = mix(vColor, vec3(0.6, 0.5, 0.8), uExplosion);
        vColor = mix(vColor, vec3(0.4, 0.0, 0.2), uChaos);
        vColor = mix(vColor, vec3(0.5, 0.3, 0.9), uSnap);
        vAlpha = 0.4 + uExplosion * 0.4 + uSnap * 0.4;
    }
}
`;

export const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float alpha = vAlpha * (1.0 - r);
    gl_FragColor = vec4(vColor, alpha);
}
`;
