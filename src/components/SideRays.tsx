import { useEffect, useRef } from "react";
import { Renderer, Program, Triangle, Mesh } from "ogl";

type Origin =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "right"
  | "top"
  | "bottom";

interface SideRaysProps {
  speed?: number;
  rayColor1?: string;
  rayColor2?: string;
  intensity?: number;
  spread?: number;
  origin?: Origin;
  tilt?: number;
  saturation?: number;
  blend?: number;
  falloff?: number;
  opacity?: number;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(v, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const originVec = (o: Origin): [number, number] => {
  switch (o) {
    case "top-left": return [0, 1];
    case "top-right": return [1, 1];
    case "bottom-left": return [0, 0];
    case "bottom-right": return [1, 0];
    case "left": return [0, 0.5];
    case "right": return [1, 0.5];
    case "top": return [0.5, 1];
    case "bottom": return [0.5, 0];
  }
};

const vert = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSpread;
uniform float uTilt;
uniform float uSaturation;
uniform float uBlend;
uniform float uFalloff;
uniform float uOpacity;
uniform vec3 uColor1;
uniform vec3 uColor2;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i.x + i.y * 57.0);
  float b = hash(i.x + 1.0 + i.y * 57.0);
  float c = hash(i.x + (i.y + 1.0) * 57.0);
  float d = hash(i.x + 1.0 + (i.y + 1.0) * 57.0);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = (uv - uOrigin) * aspect;

  float ang = atan(p.y, p.x) + uTilt;
  float dist = length(p);

  float rays = 0.0;
  float t = uTime * uSpeed * 0.2;
  for (float i = 0.0; i < 3.0; i++) {
    float freq = 6.0 + i * 4.0;
    rays += noise(vec2(ang * freq * uSpread, t + i)) / (i + 1.0);
  }
  rays = pow(clamp(rays, 0.0, 1.0), 1.5);

  float fall = 1.0 / pow(1.0 + dist, uFalloff);
  float beam = rays * fall * uIntensity;

  float mixT = clamp(0.5 + 0.5 * sin(ang * 2.0 + uTime * 0.4 * uSpeed), 0.0, 1.0);
  vec3 col = mix(uColor1, uColor2, mixT);

  float gray = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(gray), col, uSaturation);

  vec3 finalCol = col * beam;
  float alpha = clamp(beam * uBlend, 0.0, 1.0) * uOpacity;

  gl_FragColor = vec4(finalCol, alpha);
}
`;

export default function SideRays({
  speed = 1,
  rayColor1 = "#ffffff",
  rayColor2 = "#ffffff",
  intensity = 1,
  spread = 1,
  origin = "top-right",
  tilt = 0,
  saturation = 1,
  blend = 0.5,
  falloff = 1.5,
  opacity = 1,
}: SideRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio, 2) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uOrigin: { value: originVec(origin) },
        uSpeed: { value: speed },
        uIntensity: { value: intensity },
        uSpread: { value: spread },
        uTilt: { value: tilt },
        uSaturation: { value: saturation },
        uBlend: { value: blend },
        uFalloff: { value: falloff },
        uOpacity: { value: opacity },
        uColor1: { value: hexToRgb(rayColor1) },
        uColor2: { value: hexToRgb(rayColor2) },
      },
      transparent: true,
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
    };
  }, [speed, rayColor1, rayColor2, intensity, spread, origin, tilt, saturation, blend, falloff, opacity]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
