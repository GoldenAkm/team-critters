// Realistic ocean behind the Interactive Map: sunlight focused by surface ripples into shifting bright lines
// (caustics), soft light shafts from above and drifting particles, all fading with depth down the page.
// Drawn by a WebGL shader on one fixed canvas at reduced resolution (the light is soft, so it scales up
// cleanly). Returns null when WebGL isn't available, so the caller can fall back to the clean wave lines.

const RENDER_SCALE = 0.6 // canvas pixels per CSS pixel
const FRAME_MS = 1000 / 30 // the light moves slowly; 30 fps is plenty

const VERTEX = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform float uPx;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// Bright where two drifting cells meet: the network of light lines on a sunlit sea floor
float caustic(vec2 p, float t) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = hash2(cell + o);
      vec2 pt = o + 0.5 + 0.38 * sin(t * (0.5 + 0.5 * h) + 6.2831 * h);
      float d = length(pt - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return 1.0 - smoothstep(0.0, 0.14, d2 - d1);
}

void main() {
  // Position in CSS pixels: x across, y down the screen; depth is y down the whole page
  vec2 screen = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uPx;
  float depth = screen.y + uScroll;
  float t = uTime;

  // Caustics, on a layer that scrolls at half speed (further away than the page)
  vec2 q = vec2(screen.x, screen.y + uScroll * 0.5) / 150.0;
  q += 0.18 * vec2(sin(q.y * 2.3 + t * 0.55), cos(q.x * 1.9 + t * 0.5));
  float c1 = caustic(q, t * 0.7);
  float c2 = caustic(q * 1.43 + 3.7, t * 0.55 + 11.0);
  float light = pow(0.55 * max(c1, c2) + 0.6 * c1 * c2, 1.6);
  float shallow = 0.06 + 0.3 * exp(-depth / 650.0);

  // Light shafts slanting down from the surface
  float sx = screen.x + depth * 0.28;
  float rays = 0.5 + 0.5 * sin(sx * 0.011 + t * 0.12) * sin(sx * 0.027 - t * 0.09 + 1.7);
  rays = pow(rays, 3.0) * 0.16 * exp(-depth / 900.0);

  // Particles drifting slowly down, closer than the page (scroll faster)
  vec2 sp = vec2(screen.x, screen.y + uScroll * 1.2 - t * 9.0) / 64.0;
  vec2 sc = floor(sp);
  vec2 sh = hash2(sc + 17.0);
  vec2 spot = 0.2 + 0.6 * hash2(sc + 41.0) + 0.08 * vec2(sin(t * 0.4 + sh.x * 6.2831), 0.0);
  float snow = step(0.6, sh.x) * (1.0 - smoothstep(0.012, 0.035, length(fract(sp) - spot))) * (0.12 + 0.2 * sh.y);

  float a = clamp(light * shallow + rays + snow, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.62, 0.92, 0.98) * a, a);
}`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
}

export function startOceanCaustics(canvas) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false })
  if (!gl) return null
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)

  // One triangle covering the screen
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const a = gl.getAttribLocation(program, 'a')
  gl.enableVertexAttribArray(a)
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
  const u = Object.fromEntries(['uRes', 'uTime', 'uScroll', 'uPx'].map((n) => [n, gl.getUniformLocation(program, n)]))

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = performance.now()
  let frame = 0
  let lastDraw = -Infinity

  function draw(now) {
    frame = 0
    if (reduceMotion || now - lastDraw >= FRAME_MS) {
      lastDraw = now
      gl.uniform1f(u.uTime, reduceMotion ? 0 : (now - start) / 1000)
      gl.uniform1f(u.uScroll, window.scrollY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    if (!reduceMotion) frame = requestAnimationFrame(draw)
  }

  function resize() {
    canvas.width = Math.round(window.innerWidth * RENDER_SCALE)
    canvas.height = Math.round(window.innerHeight * RENDER_SCALE)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(u.uRes, canvas.width, canvas.height)
    gl.uniform1f(u.uPx, RENDER_SCALE)
    lastDraw = -Infinity
    if (reduceMotion || !frame) draw(performance.now())
  }

  // Still scene with reduced motion: redraw only when the view changes
  const onScroll = () => {
    if (reduceMotion && !frame) frame = requestAnimationFrame(draw)
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
    window.removeEventListener('scroll', onScroll)
  }
}
