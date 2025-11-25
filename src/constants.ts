import { ShaderDefinition, ShaderType } from './types';

const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    vUv.y = 1.0 - vUv.y; // Flip Y for WebGL texture
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const BASE_FRAGMENT_HEADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uResolution;
`;

// Helper for generic shaders
const createShader = (name: string, type: ShaderType, body: string, uniforms: any[] = []): ShaderDefinition => ({
  name,
  type,
  fragmentSource: `${BASE_FRAGMENT_HEADER}\n${body}`,
  uniforms,
});

// Helper GLSL functions
const GLSL_FUNCS = `
  float luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }
  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
`;

export const SHADERS: ShaderDefinition[] = [
  createShader('Real Camera', ShaderType.Normal, `
    void main() {
      gl_FragColor = texture2D(uTexture, vUv);
    }
  `),

  createShader('Ink Stamp', ShaderType.Ink, `
    ${GLSL_FUNCS}
    uniform float uThreshold;
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      float gray = luma(color.rgb);
      // Soft threshold
      float ink = smoothstep(uThreshold - 0.05, uThreshold + 0.05, gray);
      gl_FragColor = vec4(vec3(ink), 1.0);
    }
  `, [{ name: 'uThreshold', label: 'Ink Level', min: 0.1, max: 0.9, step: 0.01, defaultValue: 0.45 }]),

  createShader('Pencil Sketch', ShaderType.Sketch, `
    ${GLSL_FUNCS}
    uniform float uStrength;
    void main() {
      vec2 texel = vec2(1.0) / uResolution;
      float x = texel.x;
      float y = texel.y;
      
      // Sobel Kernels
      float s00 = luma(texture2D(uTexture, vUv + vec2(-x, -y)).rgb);
      float s10 = luma(texture2D(uTexture, vUv + vec2(0, -y)).rgb);
      float s20 = luma(texture2D(uTexture, vUv + vec2(x, -y)).rgb);
      float s01 = luma(texture2D(uTexture, vUv + vec2(-x, 0)).rgb);
      float s21 = luma(texture2D(uTexture, vUv + vec2(x, 0)).rgb);
      float s02 = luma(texture2D(uTexture, vUv + vec2(-x, y)).rgb);
      float s12 = luma(texture2D(uTexture, vUv + vec2(0, y)).rgb);
      float s22 = luma(texture2D(uTexture, vUv + vec2(x, y)).rgb);
      
      float sx = s00 * -1.0 + s20 * 1.0 + s01 * -2.0 + s21 * 2.0 + s02 * -1.0 + s22 * 1.0;
      float sy = s00 * -1.0 + s10 * -2.0 + s20 * -1.0 + s02 * 1.0 + s12 * 2.0 + s22 * 1.0;
      
      float dist = sqrt(sx * sx + sy * sy);
      float sketch = 1.0 - (dist * uStrength);
      
      gl_FragColor = vec4(vec3(sketch), 1.0);
    }
  `, [{ name: 'uStrength', label: 'Line Weight', min: 1.0, max: 5.0, step: 0.1, defaultValue: 2.0 }]),

  createShader('Comic Book', ShaderType.Comic, `
    ${GLSL_FUNCS}
    uniform float uDotSize;
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      float gray = luma(color.rgb);
      
      // Halftone pattern
      vec2 screenPos = vUv * uResolution;
      float s = sin(screenPos.x * uDotSize) * sin(screenPos.y * uDotSize) * 4.0;
      
      // Quantize color
      vec3 posterized = floor(color.rgb * 4.0) / 4.0;
      
      // Mix halftone
      float pattern = step(s, gray * 5.0);
      
      gl_FragColor = vec4(posterized * pattern, 1.0);
    }
  `, [{ name: 'uDotSize', label: 'Dot Density', min: 0.5, max: 2.0, step: 0.1, defaultValue: 1.0 }]),

  createShader('Pop Art', ShaderType.Pop, `
    ${GLSL_FUNCS}
    void main() {
      float gray = luma(texture2D(uTexture, vUv).rgb);
      vec3 col;
      
      if (gray < 0.25) col = vec3(0.1, 0.1, 0.9);      // Blue
      else if (gray < 0.5) col = vec3(0.9, 0.1, 0.1); // Red
      else if (gray < 0.75) col = vec3(0.9, 0.9, 0.1); // Yellow
      else col = vec3(0.9, 0.9, 0.9);                  // White
      
      gl_FragColor = vec4(col, 1.0);
    }
  `),

  createShader('Cyberpunk', ShaderType.Cyber, `
    ${GLSL_FUNCS}
    uniform float uMood;
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      // Push towards cyan/purple
      vec3 cyber = vec3(
        color.r * 0.5, 
        color.g * 0.8 + 0.2, 
        color.b * 1.2
      );
      // Contrast
      cyber = pow(cyber, vec3(1.2));
      gl_FragColor = vec4(mix(color.rgb, cyber, uMood), 1.0);
    }
  `, [{ name: 'uMood', label: 'Atmosphere', min: 0.0, max: 1.0, step: 0.01, defaultValue: 0.8 }]),

  createShader('Neon Edges', ShaderType.Neon, `
    uniform float uGlow;
    void main() {
      vec2 texel = vec2(1.0) / uResolution;
      float x = texel.x;
      float y = texel.y;
      
      vec4 c = texture2D(uTexture, vUv);
      vec4 c1 = texture2D(uTexture, vUv + vec2(x, 0));
      vec4 c2 = texture2D(uTexture, vUv + vec2(0, y));
      
      vec4 diff = abs(c - c1) + abs(c - c2);
      float edge = max(diff.r, max(diff.g, diff.b));
      
      // Colorize edge based on original color
      vec3 neon = c.rgb * edge * uGlow;
      
      gl_FragColor = vec4(neon, 1.0);
    }
  `, [{ name: 'uGlow', label: 'Brightness', min: 2.0, max: 10.0, step: 0.1, defaultValue: 5.0 }]),

  createShader('Dreamy', ShaderType.Dream, `
    uniform float uBlur;
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      
      // Simple box blur
      vec4 blur = vec4(0.0);
      float total = 0.0;
      float radius = uBlur;
      vec2 texel = vec2(1.0) / uResolution;
      
      for(float x=-1.0; x<=1.0; x++) {
        for(float y=-1.0; y<=1.0; y++) {
          blur += texture2D(uTexture, vUv + vec2(x,y) * texel * 2.0);
          total += 1.0;
        }
      }
      blur /= total;
      
      // Screen blend mode
      vec3 result = 1.0 - (1.0 - color.rgb) * (1.0 - blur.rgb);
      gl_FragColor = vec4(result, 1.0);
    }
  `, [{ name: 'uBlur', label: 'Softness', min: 0.0, max: 5.0, step: 0.1, defaultValue: 1.0 }]),

  createShader('Pixelate', ShaderType.Pixelate, `
    uniform float uPixels;
    void main() {
      vec2 pixels = vec2(uPixels * (uResolution.x / uResolution.y), uPixels);
      vec2 uv = floor(vUv * pixels) / pixels;
      gl_FragColor = texture2D(uTexture, uv);
    }
  `, [{ name: 'uPixels', label: 'Block Size', min: 20, max: 200, step: 5, defaultValue: 80 }]),

  createShader('Digital Glitch', ShaderType.Glitch, `
    ${GLSL_FUNCS}
    uniform float uIntensity;
    void main() {
      vec2 uv = vUv;
      float noise = rand(vec2(floor(uv.y * 50.0), uTime * 5.0));
      if(noise < uIntensity) {
         uv.x += (rand(vec2(uTime, uv.y)) - 0.5) * 0.05;
         uv.x = clamp(uv.x, 0.0, 1.0);
      }
      float r = texture2D(uTexture, uv + vec2(0.002, 0)).r;
      float g = texture2D(uTexture, uv).g;
      float b = texture2D(uTexture, uv - vec2(0.002, 0)).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `, [{ name: 'uIntensity', label: 'Glitch Rate', min: 0, max: 0.5, step: 0.01, defaultValue: 0.1 }]),

  createShader('CRT Monitor', ShaderType.CRT, `
    uniform float uLines;
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      float scanline = sin(vUv.y * uLines * 3.14159 * 2.0);
      color.rgb -= scanline * 0.15;
      gl_FragColor = color;
    }
  `, [{ name: 'uLines', label: 'Scanlines', min: 50, max: 400, step: 10, defaultValue: 200 }]),

  createShader('Vintage Film', ShaderType.Film, `
    ${GLSL_FUNCS}
    uniform float uGrain;
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      
      // Sepia tone
      vec3 sepia = vec3(
        dot(color.rgb, vec3(0.393, 0.769, 0.189)),
        dot(color.rgb, vec3(0.349, 0.686, 0.168)),
        dot(color.rgb, vec3(0.272, 0.534, 0.131))
      );
      
      // Add Grain
      float noise = (rand(vUv + uTime) - 0.5) * uGrain;
      
      gl_FragColor = vec4(mix(color.rgb, sepia, 0.5) + noise, 1.0);
    }
  `, [{ name: 'uGrain', label: 'Film Grain', min: 0, max: 0.3, step: 0.01, defaultValue: 0.1 }]),

  createShader('Thermal Vision', ShaderType.Thermal, `
    ${GLSL_FUNCS}
    void main() {
      float l = luma(texture2D(uTexture, vUv).rgb);
      vec3 c = vec3(0.0);
      // Thermal Gradient: Blue -> Yellow -> Red
      c = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 0.0), l / 0.5);
      if (l > 0.5) c = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (l - 0.5) / 0.5);
      gl_FragColor = vec4(c, 1.0);
    }
  `),

  createShader('Retro PC (1-Bit)', ShaderType.RetroPC, `
    ${GLSL_FUNCS}
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      float gray = luma(color.rgb);
      // Dither simulation using mod
      float dither = mod(gl_FragCoord.x + gl_FragCoord.y, 2.0) == 0.0 ? 0.1 : -0.1;
      float val = step(0.5, gray + dither);
      gl_FragColor = vec4(vec3(0.0, val, 0.0), 1.0); // Green phosphor
    }
  `),
];

export { VERTEX_SHADER };