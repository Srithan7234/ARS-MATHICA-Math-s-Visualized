








// --- SHARED UTILS ---
const commonFunctions = `
uniform float uTime;
uniform float uColorMode; // 0=Reference(Purple), 1=Magma, 2=Aqua, 3=Matrix, 4=Cyberpunk

vec3 getPalette(float t, float mode) {
    vec3 col = vec3(0.0);
    
    // Mode 0: Reference Style (Deep Purple / Black / Sharp)
    if (mode < 0.5) {
        // Strict adherence to reference: Black interior (handled in main), Purple exterior.
        // No red/orange/yellow gradients.
        // Oscillate between deep violet and electric purple.
        
        float val = fract(t); // 0..1
        
        // Palette: Dark Violet -> Bright Purple -> White
        vec3 c1 = vec3(0.05, 0.0, 0.15); // Almost black purple
        vec3 c2 = vec3(0.4, 0.0, 0.8);   // Deep Violet
        vec3 c3 = vec3(0.9, 0.7, 1.0);   // White/Violet tip
        
        if (val < 0.5) {
            col = mix(c1, c2, val * 2.0);
        } else {
            col = mix(c2, c3, (val - 0.5) * 2.0);
        }
        
        // Sharpen intensity
        col = pow(col, vec3(1.1));
    }
    // Magma (Fire)
    else if (mode > 0.5 && mode < 1.5) {
        col = vec3(1.0, 0.4, 0.1) * t;          
        col += vec3(0.2, 0.0, 0.2) * sin(t*10.0); 
        col = pow(col, vec3(1.2));              
    } 
    // Aqua
    else if (mode > 1.5 && mode < 2.5) {
        col = vec3(0.1, 0.7, 1.0) * t;
    }
    // Matrix
    else if (mode > 2.5 && mode < 3.5) {
        col = vec3(0.1, 1.0, 0.2) * pow(t, 2.0);
    }
    // Cyberpunk
    else {
        col = vec3(1.0, 0.1, 0.8) * t + vec3(0.1, 0.0, 1.0) * (1.0-t);
    }
    return col;
}
`;

// ==========================================
// QUAD SHADERS (VISUAL MODE - PIXEL PERFECT)
// ==========================================

export const quadVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const quadFragmentShader = `
varying vec2 vUv;

uniform vec2 uResolution;
uniform float uMode; // 0=Mandelbulb, 1=Julia, 2=Mandelbrot, 3=Tricorn, 4=Burning Ship, 5=Menger, 6=Sierpinski
uniform float uPower;
uniform vec2 uJuliaC;
uniform float uMaxIter;
uniform float uZoom;
uniform vec2 uPan;
uniform float uChaos;

` + commonFunctions + `

// --- 2D FRACTALS ---

vec2 csqr(vec2 z) {
    return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y);
}

vec3 Iterate2D(vec2 uv, float mode) {
    vec2 z = vec2(0.0);
    vec2 c = vec2(0.0);
    
    if (abs(mode - 1.0) < 0.1) { // Julia
        z = uv;
        c = uJuliaC + vec2(uChaos*0.1);
    } else if (abs(mode - 2.0) < 0.1) { // Mandelbrot
        z = vec2(0.0);
        c = uv;
    } else if (abs(mode - 3.0) < 0.1) { // Tricorn
        z = vec2(0.0);
        c = uv;
    } else { // Burning Ship
        z = vec2(0.0);
        c = uv;
    }

    float i = 0.0;
    float maxIter = uMaxIter;
    float r2 = 0.0;
    
    for (float iter = 0.0; iter < 1000.0; iter++) {
        if (iter >= maxIter) break;
        
        // Tricorn Logic
        if (abs(mode - 3.0) < 0.1) {
            z.y = -z.y;
        }
        // Burning Ship Logic
        if (abs(mode - 4.0) < 0.1) {
            z = abs(z);
        }

        z = csqr(z) + c;
        
        r2 = dot(z,z);
        if (r2 > 100.0) { // Higher escape threshold for smoother potential
            i = iter;
            break;
        }
        i = iter;
    }

    // Interior Check - PURE BLACK (STRICT)
    if (i >= maxIter - 1.0) return vec3(0.0);

    // Coloring Logic
    float t;
    if (uColorMode < 0.5) {
        // Mode 0: Reference Style - Sharper, less smoothed
        // Standard smooth coloring
        float log_zn = log(r2) / 2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);
        t = i + 1.0 - nu;
        t /= 20.0; // Tighter bands for sharper detail
        
        // No time cycling for reference style to ensure static precision
        return getPalette(t, uColorMode);
    } else {
        // Other modes
        float log_zn = log(r2) / 2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);
        t = i + 1.0 - nu;
        t /= maxIter; 
        t = pow(t, 0.5); 
        return getPalette(t * 3.0 + uTime*0.1, uColorMode);
    }
}

// --- 3D RAYMARCHING ---

// SDF Box for Menger
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float DE_MengerSponge(vec3 p) {
    // Rotation for better view
    float ang = 0.5;
    float s1 = sin(ang); float c1 = cos(ang);
    mat3 rot = mat3(c1, 0.0, s1, 0.0, 1.0, 0.0, -s1, 0.0, c1);
    p = rot * p;

    float d = sdBox(p, vec3(1.0));
    float s = 1.0;
    
    for(int i=0; i<5; i++) {
        vec3 a = mod(p*s + 1.0, 2.0) - 1.0;
        s *= 3.0;
        vec3 r = abs(1.0 - 3.0*abs(a));
        float da = max(r.x,r.y);
        float db = max(r.y,r.z);
        float dc = max(r.z,r.x);
        float c = (min(da,min(db,dc))-1.0)/s;
        d = max(d,c);
    }
    return d;
}

float DE_Sierpinski(vec3 z) {
    // Re-orient to stand on tip or base
    mat3 rot = mat3(
        0.707, 0.0, -0.707,
        0.0, 1.0, 0.0,
        0.707, 0.0, 0.707
    );
    z = rot * z;

    float scale = 2.0;
    float n = 0.0;
    for(int i=0; i<12; i++) {
        // Fold space
        if(z.x+z.y<0.0) z.xy = -z.yx; 
        if(z.x+z.z<0.0) z.xz = -z.zx; 
        if(z.y+z.z<0.0) z.yz = -z.zy;
        z = z*scale - vec3(1.0)*(scale-1.0);
        n++;
    }
    return length(z) * pow(scale, -n);
}

float DE_Mandelbulb(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float power = uPower;
    for (int i = 0; i < 8; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        float theta = acos(z.z/r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power-1.0)*power*dr + 1.0;
        
        float zr = pow(r, power);
        theta = theta*power + uTime * 0.1;
        phi = phi*power + uTime * 0.1;
        
        z = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta));
        z += p;
    }
    return 0.5 * log(r) * r / dr;
}

float map(vec3 p) {
    if (uMode < 0.5) return DE_Mandelbulb(p);
    if (abs(uMode - 5.0) < 0.1) return DE_MengerSponge(p);
    if (abs(uMode - 6.0) < 0.1) return DE_Sierpinski(p);
    return length(p) - 1.0; 
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p+e.xyy) - map(p-e.xyy),
        map(p+e.yxy) - map(p-e.yxy),
        map(p+e.yyx) - map(p-e.yyx)
    ));
}

vec3 Raymarch(vec2 uv) {
    // Zoom Logic: Inversely scale distance. 
    // uZoom 1.0 = Standard distance (-3.5)
    // uZoom 0.1 = Far away (-35.0)
    // uZoom 10.0 = Close up (-0.35)
    float zoomVal = clamp(uZoom, 0.001, 1000.0);
    float baseDist = 3.5;
    
    // Menger & Sierpinski Camera Adjustment
    if (abs(uMode - 5.0) < 0.1 || abs(uMode - 6.0) < 0.1) {
        baseDist = 2.8;
    }
    
    vec3 ro = vec3(0.0, 0.0, -baseDist / zoomVal);
    vec3 rd = normalize(vec3(uv, 1.5)); 

    float angX = uPan.x * 2.0;
    float angY = uPan.y * 2.0;
    
    // Rotation Orbit
    mat3 rotY = mat3(cos(angX), 0.0, sin(angX), 0.0, 1.0, 0.0, -sin(angX), 0.0, cos(angX));
    mat3 rotX = mat3(1.0, 0.0, 0.0, 0.0, cos(angY), -sin(angY), 0.0, sin(angY), cos(angY));
    
    // Rotate both position and view ray to orbit around origin
    ro = rotY * rotX * ro;
    rd = rotY * rotX * rd;

    float t = 0.0;
    for(int i=0; i<100; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if(d < 0.001) {
            vec3 n = calcNormal(p);
            
            // --- MENGER SPONGE LOOK (White Ceramic) ---
            if (abs(uMode - 5.0) < 0.1) {
                vec3 lightPos = vec3(2.0, 4.0, -3.0);
                vec3 l = normalize(lightPos - p);
                float dif = clamp(dot(n, l), 0.0, 1.0);
                float amb = 0.5; 
                vec3 matColor = vec3(0.95, 0.95, 0.95);
                float ao = 1.0 - (float(i) / 100.0);
                vec3 col = matColor * (dif * 0.8 + amb) * ao;
                col = mix(col, vec3(0.1), 1.0 - exp(-0.02*t*t));
                return col;
            } 

            // --- SIERPINSKI LOOK (Red/Blue Split) ---
            if (abs(uMode - 6.0) < 0.1) {
                 vec3 lightPos = vec3(2.0, 4.0, -3.0);
                 vec3 l = normalize(lightPos - p);
                 float dif = clamp(dot(n, l), 0.0, 1.0);
                 float amb = 0.3;
                 vec3 matColor;
                 float splitVal = p.x + p.y * 0.5; 
                 if (splitVal > 0.0) matColor = vec3(0.1, 0.4, 0.9); // Blue
                 else matColor = vec3(0.9, 0.2, 0.2); // Red
                 vec3 col = matColor * (dif + amb);
                 vec3 ref = reflect(-l, n);
                 float spec = pow(clamp(dot(ref, rd), 0.0, 1.0), 16.0);
                 col += vec3(1.0) * spec * 0.4;
                 float ao = 1.0 - (float(i) / 80.0);
                 col *= ao;
                 col = mix(col, vec3(0.0), 1.0 - exp(-0.02*t*t));
                 return col;
            }
            
            // --- DEFAULT MANDELBULB LIGHTING ---
            vec3 lig = normalize(vec3(0.8, 0.7, -0.6));
            float dif = clamp(dot(n, lig), 0.0, 1.0);
            float amb = 0.5 + 0.5*n.y;
            vec3 col = vec3(0.2,0.3,0.4)*amb + vec3(0.8,0.7,0.5)*dif;
            float rim = pow(clamp(1.0 + dot(n, rd), 0.0, 1.0), 4.0);
            col += vec3(1.0, 0.5, 0.2) * rim;
            col = mix(col, vec3(0.0), 1.0 - exp(-0.05*t*t));
            return col;
        }
        t += d;
        if(t > 10.0) break;
    }
    return vec3(0.0);
}

void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    // Fix: Prevent division by zero if uResolution is not initialized
    if (uResolution.y > 0.0) {
        uv.x *= uResolution.x / uResolution.y;
    }

    vec3 col = vec3(0.0);

    // 0=Mandelbulb, 5=Menger, 6=Sierpinski -> Raymarch
    // 1-4=2D Fractals
    if (uMode < 0.5 || uMode > 4.5) {
        col = Raymarch(uv);
    } else {
        // 2D Zoom: Divide UV by zoom to shrink viewport (magnify image)
        float zVal = uZoom;
        if (zVal < 0.0001) zVal = 0.0001; // Safety
        
        vec2 fractalUV = uv / zVal + uPan;
        col = Iterate2D(fractalUV, uMode);
    }
    
    gl_FragColor = vec4(col, 1.0);
}
`;

// ==========================================
// PARTICLE SHADERS (INTERACTIVE MODE)
// ==========================================

export const particleVertexShader = `
uniform float uMode;
uniform float uPower;
uniform vec2 uJuliaC;
uniform vec3 uHandPos;
uniform float uAttractStrength;
uniform float uRepelStrength;
uniform float uZoom;
uniform vec2 uPan;

varying vec3 vColor;
varying float vAlpha;

` + commonFunctions + `

// --- Particle-Specific DE Logic ---
float DE_Menger_Particle(vec3 p) {
    float ang = 0.5;
    float s1 = sin(ang); float c1 = cos(ang);
    mat3 rot = mat3(c1, 0.0, s1, 0.0, 1.0, 0.0, -s1, 0.0, c1);
    p = rot * p;

    vec3 b = vec3(1.0);
    vec3 q = abs(p) - b;
    float d = length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
    float s = 1.0;
    
    for(int i=0; i<4; i++) {
        vec3 a = mod(p*s + 1.0, 2.0) - 1.0;
        s *= 3.0;
        vec3 r = abs(1.0 - 3.0*abs(a));
        float da = max(r.x,r.y);
        float db = max(r.y,r.z);
        float dc = max(r.z,r.x);
        float c = (min(da,min(db,dc))-1.0)/s;
        d = max(d,c);
    }
    return d;
}

float DE_Sierpinski_Particle(vec3 z) {
    mat3 rot = mat3(0.707, 0.0, -0.707, 0.0, 1.0, 0.0, 0.707, 0.0, 0.707);
    z = rot * z;
    float scale = 2.0;
    float n = 0.0;
    for(int i=0; i<8; i++) {
        if(z.x+z.y<0.0) z.xy = -z.yx; 
        if(z.x+z.z<0.0) z.xz = -z.zx; 
        if(z.y+z.z<0.0) z.yz = -z.zy;
        z = z*scale - vec3(1.0)*(scale-1.0);
        n++;
    }
    return length(z) * pow(scale, -n);
}

void main() {
    vec3 pos = position;
    
    // --- INTERACTION PHYSICS ---
    float d = distance(pos, uHandPos);
    if (d < 2.5) {
         float force = smoothstep(2.5, 0.0, d); 
         pos += (uHandPos - pos) * force * uAttractStrength * 0.15;
         pos += normalize(pos - uHandPos) * force * uRepelStrength * 0.3;
    }

    float pointSize = 1.0;
    float alpha = 1.0;
    float t_col = 0.5;

    // 3D Fractals Logic
    if (uMode < 0.5 || uMode > 4.5) {
         if (uMode < 0.5) {
             // Mandelbulb
             vec3 z = pos;
             float r = 0.0;
             float dr = 1.0;
             for (int i=0; i<8; i++) {
                 r = length(z);
                 if (r > 2.0) break;
                 float theta = acos(z.z/r);
                 float phi = atan(z.y, z.x);
                 dr = pow(r, uPower-1.0)*uPower*dr + 1.0;
                 float zr = pow(r, uPower);
                 theta = theta*uPower + uTime * 0.2;
                 phi = phi*uPower + uTime * 0.2;
                 z = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta));
                 z += pos;
             }
             pos = z * 0.2; 
             t_col = length(pos);
         } 
         else if (abs(uMode - 5.0) < 0.1) {
             // Menger Sponge
             float dist = DE_Menger_Particle(pos);
             float surfaceWidth = 0.05; 
             alpha = 1.0 - smoothstep(0.0, surfaceWidth, dist);
             if (dist > surfaceWidth) pointSize = 0.0;
             t_col = pos.x + pos.y + pos.z;
         }
         else if (abs(uMode - 6.0) < 0.1) {
             // Sierpinski
             float dist = DE_Sierpinski_Particle(pos);
             float surfaceWidth = 0.05;
             alpha = 1.0 - smoothstep(0.0, surfaceWidth, dist);
             if (dist > surfaceWidth) pointSize = 0.0;
             if (pos.x + pos.y * 0.5 > 0.0) t_col = 0.8;
             else t_col = 0.2;
         }
         
         // 3D View Nav
         float angX = uPan.x * 2.0;
         float angY = uPan.y * 2.0;
         mat3 rotY = mat3(cos(angX), 0.0, sin(angX), 0.0, 1.0, 0.0, -sin(angX), 0.0, cos(angX));
         mat3 rotX = mat3(1.0, 0.0, 0.0, 0.0, cos(angY), -sin(angY), 0.0, sin(angY), cos(angY));
         pos = rotY * rotX * pos;
         pos *= clamp(uZoom, 0.1, 100.0);
    } 
    // 2D Logic
    else {
        float zVal = uZoom;
        if (zVal < 0.0001) zVal = 0.0001;

        vec2 fractalCoords = (pos.xy * 2.0 / zVal) + uPan;
        vec2 z = fractalCoords; 
        vec2 c = uJuliaC;
        
        // Mandelbrot: z starts at 0, c is coords
        if (abs(uMode - 2.0) < 0.1) { 
            z = vec2(0.0);
            c = fractalCoords;
        } 
        // Burning Ship & Tricorn
        else if (abs(uMode - 3.0) < 0.1 || abs(uMode - 4.0) < 0.1) {
            z = vec2(0.0);
            c = fractalCoords;
        }

        float iterCount = 0.0;
        for(int i=0; i<15; i++) {
            // Tricorn Logic
            if (abs(uMode - 3.0) < 0.1) { z.y = -z.y; }
            // Burning Ship Logic
            if (abs(uMode - 4.0) < 0.1) { z = abs(z); }

            z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
            if(length(z) > 4.0) break;
            iterCount += 1.0;
        }
        
        t_col = iterCount / 15.0;
        
        // Hide particles that escape immediately (background)
        if (iterCount < 1.0) alpha = 0.0;

        // Keep particle at its grid position, but flatten to 2D plane
        pos.z = 0.0; 
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    if (pointSize > 0.0) {
        float dist = -mvPosition.z;
        gl_PointSize = clamp(30.0 / dist, 1.0, 5.0) * pointSize;
    } else {
        gl_PointSize = 0.0;
    }
    
    vColor = getPalette(t_col + uTime*0.1, uColorMode);
    vAlpha = alpha;
}
`;

export const particleFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
    // Soft round particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord) * 2.0;
    if (dist > 1.0) discard;
    
    // Smooth gradient
    float glow = 1.0 - smoothstep(0.0, 1.0, dist);
    
    // DRASTICALLY REDUCED ALPHA for Additive Blending
    // This allows thousands of particles to stack without whiteout
    gl_FragColor = vec4(vColor, vAlpha * 0.15 * glow);
}
`;
