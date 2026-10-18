import { useEffect, useRef } from 'react';

// The water behind Digital Fishers: the same water as the 3D viewer (components/underwater/UnderwaterViewer.js),
// filling the window while the page scrolls over it. Light shafts and a rippling caustic net under the surface,
// marine snow at three depths that shifts with scroll (parallax), streams of bubbles rising to the surface, and
// now and then a fish (or a small school) crossing in the distance as a soft silhouette, each one built differently.
// One full-window fragment shader, drawn at CSS-pixel size and about 30 fps; a still frame for reduced motion.
// Without WebGL the page's CSS gradient shows instead. Decorative only.

const FROZEN_TIME = 12; // the same still moment the 3D viewer uses for reduced motion
const FRAME_MS = 1000 / 30;

const VS = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0., 1.); }`;

const FS = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;      // canvas size in px
uniform float uTime;    // seconds
uniform float uScroll;  // page scroll in window heights (parallax)
uniform float uDepth;   // 0 at the top of the page, 1 at the bottom

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float noise(float x) { float i = floor(x), f = fract(x); return mix(hash(vec2(i, 1.7)), hash(vec2(i + 1., 1.7)), f * f * (3. - 2. * f)); }

// Moving cell noise: distances to the nearest and second-nearest wandering point.
vec2 cells(vec2 x, float t) {
  vec2 n = floor(x), f = fract(x);
  float d1 = 8., d2 = 8.;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = .5 + .45 * sin(t + 6.2831 * hash2(n + g));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return vec2(d1, d2);
}

// The rippling net of light under the surface: bright where cells meet, two layers moving at different speeds.
float caustics(vec2 x, float t) {
  vec2 a = cells(x, t);
  vec2 b = cells(x * 1.7 + 4.3, t * 1.3 + 1.);
  float ea = 1. - smoothstep(0., .12, a.y - a.x);
  float eb = 1. - smoothstep(0., .12, b.y - b.x);
  return ea * .6 + eb * .4 + ea * eb;
}

// One layer of marine snow: at most one speck per cell, sinking and swaying. par: how far it moves with scroll.
float snow(vec2 p, float n, float size, float sink, float par, float t) {
  vec2 s = p * n;
  s.y += (t * sink - uScroll * par) * n;
  s.x += sin(s.y * .3 + t * .25) * .3;
  vec2 c = floor(s), f = fract(s) - .5;
  vec2 h = hash2(c);
  float d = length(f - (h - .5) * .6);
  float twinkle = .6 + .4 * sin(t * (.8 + h.y * 1.5) + h.x * 40.);
  return step(h.x, .5) * smoothstep(size, size * .15, d) * twinkle;
}

// Streams of bubbles rising to the surface: they wobble, swell as they rise and catch the light from above.
// Returns (shell, glint).
vec2 bubbles(vec2 p, float aspect, float t) {
  float shell = 0., glint = 0.;
  for (int s = 0; s < 10; s++) {
    float fs = float(s);
    float sx = (.03 + .94 * hash(vec2(fs, 9.2))) * aspect;
    if (abs(p.x - sx) > .07) continue;
    for (int k = 0; k < 7; k++) {
      vec2 h = hash2(vec2(fs * 7.1 + 1., float(k) * 3.7 + 2.));
      float y = fract(t * (.04 + .03 * h.x) + h.y + uScroll * .3) * 1.3 - .15;
      float r = (.005 + .01 * h.x * h.x) * (.8 + .4 * y);
      vec2 c = vec2(sx + (h.y - .5) * .03 + .008 * sin(y * 13. + h.x * 6.3 + t * 1.4), y);
      vec2 d = (p - c) * vec2(1., 1.15);
      float l = length(d);
      float fade = smoothstep(-.15, .05, y) * (1. - smoothstep(.9, 1.1, y));
      shell += (smoothstep(r, r * .72, l) - .75 * smoothstep(r * .8, r * .35, l)) * fade;
      glint += smoothstep(r * .4, 0., length(d + vec2(.38, -.38) * r)) * fade;
    }
  }
  return vec2(shell, glint);
}

vec4 hash4(vec2 p) { return vec4(hash2(p), hash2(p + 19.19)); }

// A fish seen side-on, as a soft silhouette (0-1 coverage). q: the fish's own frame in half-lengths, nose at
// x = 1, the tail stalk ending at x = -.75 and the tail fin running on from there. b and f: its build, random
// 0-1 values that make every fish different (depth and head shape, fins, tail shape, swimming beat).
// aa: how soft its edges are.
float fish(vec2 q, float t, vec4 b, vec4 f, float aa) {
  float beat = 4. + 4. * f.x;
  float phase = b.x * 6.2831;
  // The body bends in a wave that runs back to the tail and grows toward it.
  float u = clamp((1. - q.x) / 1.75, 0., 1.); // 0 at the nose, 1 where the tail fin starts
  q.y -= (.035 + .04 * f.y) * u * u * sin(u * 5. - t * beat + phase);

  // Body: a streamlined profile (the NACA airfoil thickness curve) with a rounded nose, tapering to a slim tail
  // stalk, and a little camber so the back arches more than the belly. Deep or slim, more or less arched, and a
  // snout from round (rockfish) to long and pointed (lingcod, greenling).
  float th = (.16 + .28 * b.y) * 1.75;
  float s = pow(u, 1. + .9 * fract(b.y * 7.3 + f.x * 3.1));
  float yt = 5. * th * (.2969 * sqrt(s) - .126 * s - .3516 * s * s + .2843 * s * s * s - .1015 * s * s * s * s);
  float cam = .02 + .05 * b.z;
  float yc = 1.75 * (u < .4 ? cam / .16 * (.8 * u - u * u) : cam / .36 * (.2 + .8 * u - u * u));
  float stalk = .06 + .05 * b.w;
  float back = mix(yc + yt, stalk, smoothstep(.72, 1., u));
  float belly = mix(yt - yc, stalk, smoothstep(.7, 1., u));
  float body = q.x > -.76 ? (1. - smoothstep(-aa, aa, max(q.y - back, -belly - q.y))) * (1. - smoothstep(1. - aa, 1. + aa, q.x)) : 0.;

  // Dorsal fin along the back: smooth, or (like a rockfish's) spiny and notched at the front with a soft,
  // rounded part behind; long or short.
  float fin = 0.;
  float d0 = .18 + .14 * f.z;
  float d1 = d0 + .28 + .2 * f.w;
  float v = (u - d0) / (d1 - d0);
  if (v > 0. && v < 1.) {
    float h = (.08 + .1 * b.w) * pow(sin(3.1416 * pow(v, .55)), 1.1);
    h *= 1. - step(.5, f.z) * (1. - smoothstep(.5, .66, v)) * .45 * pow(abs(sin(v * 3.1416 * (6. + 4. * f.w))), 2.);
    fin = 1. - smoothstep(-aa, aa, max(q.y - back - h, back - .02 - q.y));
  }
  // Anal fin near the tail and a small pelvic fin under the chest.
  float va = (u - .62) / .16;
  if (va > 0. && va < 1.) {
    float h = (.05 + .04 * f.y) * sin(3.1416 * pow(va, .6));
    fin = max(fin, 1. - smoothstep(-aa, aa, max(-q.y - belly - h, q.y + belly - .02)));
  }
  float vp = (u - .3) / .1;
  if (vp > 0. && vp < 1.) {
    float h = .07 * (1. - vp) * b.z;
    fin = max(fin, 1. - smoothstep(-aa, aa, max(-q.y - belly - h, q.y + belly - .02)));
  }

  // Tail fin: fans out quickly from the stalk into broad lobes and flaps with the wave; rounded, square or forked.
  // A fork stays shallow, with a curved notch and rounded tips, so it reads as a fin rather than an arrow.
  float tail = 0.;
  float len = .38 + .2 * b.x;
  float tx = (-.75 - q.x) / len; // 0 at the stalk, 1 at the tips
  if (tx > -.05 && tx < 1.3) {
    float ty = q.y - (.25 + .2 * f.y) * cos(5. - t * beat + phase) * tx * len;
    float spread = stalk + (.24 + .14 * b.y - stalk) * smoothstep(0., .4, tx);
    float k = clamp(abs(ty) / spread, 0., 1.);
    float fork = f.w * 1.05 - .45; // under 0 rounded, 0 square, over 0 forked (at most 60% deep)
    float edge = 1. - max(fork, 0.) * pow(1. - k, 1.4) - max(-fork, 0.) * k * k - .12 * pow(k, 5.);
    tail = 1. - smoothstep(-aa, aa, max(abs(ty) - spread, (tx - edge) * len));
  }

  // Fins are thin, so a little paler than the body; the belly is a shade lighter than the back.
  float shade = 1. - .18 * smoothstep(0., max(belly, .05), -q.y);
  return max(body * shade, max(fin, tail) * .82);
}

// Now and then a fish swims across in the distance: four slots, each crossing for 14-24 s once every 45-80 s,
// at a random height, direction, speed and distance (further = smaller, fainter, softer), rising and falling a
// little with the body tilted to follow. Every crossing is a new fish. The last slot is a small school of one kind,
// each member a little different.
float fishes(vec2 p, float aspect, float t) {
  float cover = 0.;
  float px = 1. / uRes.y;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float period = 45. + 35. * hash(vec2(fi, 4.1));
    float u = t + period * hash(vec2(fi, 7.3));
    float cycle = floor(u / period);
    vec2 h = hash2(vec2(fi * 13.7, cycle));
    float k = mod(u, period) / (14. + 10. * h.x);
    if (k > 1.) continue;
    float far = h.y;
    vec4 b = hash4(vec2(fi + 1.3, cycle));
    vec4 f = hash4(vec2(fi + 5.7, cycle + .5));
    bool school = i == 3;
    float size = mix(.065, .022, far) * (school ? .55 : 1.);
    float dir = hash(vec2(cycle, fi + .5)) > .5 ? 1. : -1.;
    float x0 = mix(-.3, aspect + .3, dir > 0. ? k : 1. - k);
    float ang = k * 6.2831 * (1. + f.z) + b.x * 6.2831;
    float y0 = .22 + .6 * hash(vec2(cycle * 1.7, fi)) + .025 * sin(ang) + uScroll * mix(.3, .1, far);
    float pitch = atan(.025 * 6.2831 * (1. + f.z) * cos(ang), aspect + .6);
    float pc = cos(pitch);
    float ps = sin(pitch);
    for (int m = 0; m < 6; m++) {
      if (m > 0 && !school) break;
      float fm = float(m);
      vec2 j = hash2(vec2(fm, fi + cycle));
      vec2 off = m == 0 ? vec2(0.) : (j - .5) * vec2(7., 3.5) * size + .3 * size * vec2(sin(t * .7 + fm), cos(t * .5 + fm * 2.));
      float sz = size * (m == 0 ? 1. : .85 + .3 * j.x);
      vec2 d = p - vec2(x0, y0) - off;
      if (abs(d.x) > 1.6 * sz || abs(d.y) > .9 * sz) continue;
      vec2 q = vec2(d.x * dir, d.y) / sz;
      q = vec2(pc * q.x + ps * q.y, -ps * q.x + pc * q.y);
      float a = fish(q, t + fm * 1.3, b, f + vec4(j.y * .2, 0., 0., 0.), px / sz * 1.3 + far * .05);
      cover = max(cover, a * mix(.62, .22, far));
    }
  }
  return cover;
}

void main() {
  vec2 q = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(q.x * aspect, q.y);
  float t = uTime;

  // Water in the 3D viewer's colours, a little darker the further down the page.
  vec3 col = mix(vec3(.01, .05, .065), vec3(.07, .27, .3), pow(q.y, 1.5));
  col *= 1. - .3 * uDepth;

  // Distant fish, dark against the water and behind the light shafts.
  col = mix(col, vec3(.004, .024, .03), fishes(p, aspect, t));

  // Light shafts fanning out from the sun above the top-left corner: broad beams with finer streaks inside,
  // slowly swaying and flickering as the surface moves, strongest near the surface.
  vec2 sun = vec2(aspect * .25 - .35 + .05 * sin(t * .05), 1.5);
  vec2 d = p - sun;
  float a = atan(d.x, -d.y);
  float broad = (sin(a * 17. + t * .22) * .5 + .5) * (sin(a * 7.3 - t * .15 + 1.3) * .5 + .5);
  float fine = (sin(a * 41. + t * .31) * .5 + .5) * (sin(a * 63. - t * .23) * .5 + .5);
  float shafts = broad * broad * (.6 + .4 * fine) * (.65 + .7 * noise(a * 9. + t * .3));
  float lit = pow(q.y, 1.1) * smoothstep(2.2, .4, length(d)) * (1. - .5 * uDepth);
  col += vec3(.08, .21, .21) * shafts * lit;
  col += vec3(.02, .07, .08) * pow(q.y, 5.);

  // The surface: a rippling line of light along the top, with the caustic net under it,
  // squeezed vertically as if seen at an angle.
  float ripple = .012 * sin(p.x * 9. + t * .7 + 1.5 * sin(p.x * 3.1 - t * .45));
  col += vec3(.12, .3, .32) * smoothstep(.955, 1., q.y + ripple) * (1. - .6 * uDepth);
  float surf = smoothstep(.5, 1., q.y);
  if (surf > 0.) col += vec3(.1, .22, .22) * caustics(vec2(p.x * 2.6 + t * .02, q.y * 7.), t * .6) * surf * surf * (1. - .6 * uDepth) * .4;

  // Marine snow at three depths, lit more inside the shafts: far specks, nearer flakes, and soft out-of-focus
  // motes close to the camera. Then the bubbles.
  float glow = .45 + .55 * q.y + shafts * 1.5;
  float flakes = snow(p, 34., .09, .004, .08, t) * .4 + snow(p + 3.7, 15., .06, .007, .25, t) * .5 + snow(p + 9.1, 5., .22, .012, .6, t) * .12;
  col += vec3(.8, .92, .9) * flakes * glow * .5;
  vec2 b = bubbles(p, aspect, t);
  col += vec3(.55, .85, .9) * b.x * .35 + vec3(1.) * b.y * .55;

  col *= .97 + .06 * noise(t * .9);

  // Vignette, as in the viewer, and a little dither against banding in the dark gradient.
  float v = length((q - vec2(.5, .6)) * vec2(1.1, 1.));
  col *= 1. - .35 * smoothstep(.45, 1.2, v);
  col += (hash(gl_FragCoord.xy + fract(t)) - .5) / 255.;
  gl_FragColor = vec4(col, 1.);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn('Water background shader failed to compile:', gl.getShaderInfoLog(shader));
  return null;
}

function createProgram(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VS);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

export default function WaterBackground() {
  const canvas = useRef(null);

  useEffect(() => {
    const el = canvas.current;
    const gl = el?.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    const program = gl && !gl.isContextLost() && createProgram(gl);
    // No WebGL: hide the canvas so the page's CSS gradient shows.
    el.hidden = !program;
    if (!program) return undefined;

    // One triangle that covers the whole window.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uScroll = gl.getUniformLocation(program, 'uScroll');
    const uDepth = gl.getUniformLocation(program, 'uDepth');

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const start = performance.now();
    let raf = 0;
    let last = -Infinity;

    function draw(now) {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl.viewport(0, 0, w, h);
      }
      const still = reduced.matches;
      const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, still ? FROZEN_TIME : (now - start) / 1000);
      gl.uniform1f(uScroll, still ? 0 : scrollY / innerHeight);
      gl.uniform1f(uDepth, Math.min(1, scrollY / range));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now);
    }

    // Reduced motion: one still frame, redrawn only when the window or scroll changes.
    function run() {
      cancelAnimationFrame(raf);
      draw(performance.now());
      if (!reduced.matches) raf = requestAnimationFrame(loop);
    }
    const redrawStill = () => reduced.matches && draw(performance.now());

    const resize = new ResizeObserver(redrawStill);
    resize.observe(el);
    addEventListener('scroll', redrawStill, { passive: true });
    reduced.addEventListener('change', run);
    const onLost = (e) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      el.hidden = true;
    };
    el.addEventListener('webglcontextlost', onLost);
    run();

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      removeEventListener('scroll', redrawStill);
      reduced.removeEventListener('change', run);
      el.removeEventListener('webglcontextlost', onLost);
    };
  }, []);

  return <canvas ref={canvas} className="df-water" aria-hidden="true" />;
}
