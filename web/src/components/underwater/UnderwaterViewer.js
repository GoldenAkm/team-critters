import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Underwater three.js viewer for species GLBs (scene units are metres, fish centred at the origin).
// Look: shader background with god rays, cyan key light with caustics, capped distance fog,
// marine snow, idle bob and a slow turntable. Imperative on purpose: ModelViewer.jsx drives it.

const FOG_COLOUR = 'vec3(.02,.11,.13)';
const FOV = 30;
const DEFAULT_DISTANCE = 0.8;
const HALF_WIDTH = 0.27; // fish half-length plus margin, for fitting narrow viewports
const TURNTABLE_RAD_PER_S = 0.18;
const FROZEN_TIME = 12; // static frame used when the viewer prefers reduced motion

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const clockStart = performance.now();
const shared = { uTime: { value: 0 } };

// ---------- background ----------
const BG_VS = /* glsl */ `
varying vec2 vQ;
void main() { vQ = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;
const BG_FS = /* glsl */ `
varying vec2 vQ;
uniform float uTime, uAspect;
void main() {
  vec2 q = vQ; float t = uTime;
  vec3 col = mix(vec3(.01,.05,.065), vec3(.07,.27,.3), pow(q.y, 1.5));
  float x = q.x - (1. - q.y) * .35;
  float r = (sin(x*23. + t*.3)*.5+.5) * (sin(x*11. - t*.2)*.5+.5) * (sin(x*37. + t*.15)*.5+.5);
  col += vec3(.05,.13,.13) * r * r * pow(q.y, 2.2);
  float v = length((q - vec2(.5,.55)) * vec2(uAspect, 1.));
  col *= 1. - .35 * smoothstep(.4, 1.3, v);
  gl_FragColor = vec4(col, 1.);
}`;

// ---------- marine snow ----------
const SNOW_COUNT = 420;
const SNOW_VS = /* glsl */ `
attribute float aW;
uniform float uTime, uViewportH;
void main() {
  vec3 p = position; float t = uTime;
  p.y = mod(p.y - t*.0042 + .56, 1.12) - .56;
  p.x += sin(t*.2 + p.z*11.4) * .0175;
  p.z += cos(t*.17 + p.x*8.6) * .014;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  gl_PointSize = uViewportH * .0045 * aW / gl_Position.w;
}`;
const SNOW_FS = /* glsl */ `
void main() {
  float a = smoothstep(.5, .1, length(gl_PointCoord - .5)) * .35;
  gl_FragColor = vec4(vec3(.8,.92,.9), a);
}`;

// ---------- fish material patch: caustics on the key light, tone curve, capped fog ----------
const CAUSTICS = /* glsl */ `
uniform float uTime;
varying vec3 vUwWorld;
float caust(vec2 p) {
  float t = uTime * .7;
  float v = (sin(p.x*3.1 + t) + sin(p.y*3.7 - t*1.3) + sin((p.x+p.y)*2.3 + t*.7) + sin(length(p + vec2(t*.2, 0.))*4.)) * .25;
  return pow(1. - abs(v), 7.);
}`;

// ---------- swim: per-vertex body wave and fin motion (docs: copper-rockfish swim spec) ----------
// Needs the _SWIM vertex attribute = [s, t, h, finType] on every mesh. All maths is in model units
// (snout x = 0, caudal base x = 1), i.e. on position/transformed before modelMatrix.
// uSwim and uIdle are set per viewer right before it renders, so viewers sharing a model stay independent.
const swimUniforms = { uTime: shared.uTime, uSwim: { value: 0 }, uIdle: { value: 1 } };
const SWIM_COMMON = /* glsl */ `
attribute vec4 _swim;
uniform float uTime, uSwim, uIdle;`;
const SWIM_NORMAL = /* glsl */ `
float sw_x = position.x;
float sw_s = clamp((sw_x - .25) / .85, 0., 1.);
float sw_A = uSwim * (.006 + .06 * sw_s * sw_s);
float sw_ph = 7. * sw_x - 6. * uTime;
float sw_dzdx = sw_A * 7. * cos(sw_ph) + uSwim * .12 * sw_s / .85 * sin(sw_ph);
objectNormal = normalize(vec3(objectNormal.x - sw_dzdx * objectNormal.z, objectNormal.y, objectNormal.z));`;
const SWIM_VERTEX = /* glsl */ `
float sw_ty = _swim.w, sw_h = _swim.z;
// pectoral: only ever opens outward from the body; root stays fixed (h*h)
if (sw_ty > 3.5 && sw_ty < 4.5) {
  float f = (.5 + .5 * sin(uTime * 2.2)) * (.35 * uIdle + uSwim * .8);
  transformed.z += sign(transformed.z) * sw_h * sw_h * .12 * f;
  transformed.x -= sw_h * sw_h * .03 * f;
}
// pelvic: same idea, smaller, offset in phase
if (sw_ty > 4.5) {
  transformed.z += sign(transformed.z) * sw_h * sw_h * .06 * (.5 + .5 * sin(uTime * 2.2 + 1.)) * (.3 * uIdle + .6 * uSwim);
}
// dorsal, caudal, anal (membranes AND their spines): gentle ripple travelling along the fin
if (sw_ty > .5 && sw_ty < 3.5) {
  transformed.z += sw_h * .01 * sin(uTime * 3. + sw_x * 25.) * (.5 * uIdle + uSwim);
}
// body wave: amplitude grows toward the tail, small counter-sway at the head
transformed.z += sw_A * sin(sw_ph) - uSwim * .01 * sin(uTime * 6. - 1.) * (1. - sw_s);
// idle bob
transformed.y += .006 * sin(uTime * .9) * uIdle;`;

// Same body offset in JS, for hotspots that ride on the fish (model units).
function swimOffset(x, t, swim, idle) {
  const s = THREE.MathUtils.clamp((x - 0.25) / 0.85, 0, 1);
  const A = swim * (0.006 + 0.06 * s * s);
  return {
    dz: A * Math.sin(7 * x - 6 * t) - swim * 0.01 * Math.sin(6 * t - 1) * (1 - s),
    dy: 0.006 * Math.sin(t * 0.9) * idle,
  };
}

function patchMaterial(material, vertexSwim) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    let vs = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vUwWorld;${vertexSwim ? SWIM_COMMON : ''}`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvUwWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    if (vertexSwim) {
      Object.assign(shader.uniforms, swimUniforms);
      // Fin offsets come before the body wave so the fins ride on the bending body.
      vs = vs
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>${SWIM_NORMAL}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>${SWIM_VERTEX}`);
    }
    shader.vertexShader = vs;
    // Only the key light (directional light 0) gets the caustic factor, diffuse and specular alike.
    const lights = THREE.ShaderChunk.lights_fragment_begin.replace(
      'getDirectionalLightInfo( directionalLight, directLight );',
      'getDirectionalLightInfo( directionalLight, directLight );\n\t\tif ( UNROLLED_LOOP_INDEX == 0 ) directLight.color *= uwCaustScale;',
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CAUSTICS}`)
      .replace(
        '#include <lights_fragment_begin>',
        `vec3 uwWorldN = inverseTransformDirection( normal, viewMatrix );
float uwCaustScale = .72 + 1.1 * caust(vUwWorld.xz * 14.3 + vUwWorld.y * 4.3) * clamp(uwWorldN.y * .8 + .4, 0., 1.);
${lights}`,
      )
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = 1.0 - exp( -gl_FragColor.rgb * 1.3 );')
      // Fog in display space so it meets the background colour; capped at 60% to keep the fish readable.
      .replace(
        '#include <fog_fragment>',
        `{ float uwDist = length(vUwWorld - cameraPosition);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, ${FOG_COLOUR}, (1. - exp(-uwDist * .457)) * .6); }`,
      );
  };
  material.customProgramCacheKey = () => (vertexSwim ? 'underwater-v1-swim' : 'underwater-v1');
  material.needsUpdate = true;
}

// One load (and one material patch) per file, shared by every viewer instance.
const loader = new GLTFLoader();
const cache = new Map();
function loadModel(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      loader.loadAsync(url).then((gltf) => {
        const meshes = [];
        gltf.scene.traverse((o) => o.isMesh && meshes.push(o));
        // Every mesh must carry _swim, or spines and eyes would detach from the bending body.
        const vertexSwim = meshes.length > 0 && meshes.every((m) => m.geometry.attributes._swim);
        const materials = new Set(meshes.flatMap((m) => [].concat(m.material)));
        materials.forEach((m) => patchMaterial(m, vertexSwim));
        gltf.userData.vertexSwim = vertexSwim;
        return gltf;
      }),
    );
  }
  return cache.get(url);
}

function fromSpherical(theta, phi, radius) {
  return new THREE.Vector3().setFromSphericalCoords(radius, THREE.MathUtils.degToRad(Math.max(phi, 0.01)), THREE.MathUtils.degToRad(theta));
}

export default class UnderwaterViewer {
  constructor(container, { startView = [0, 90], onAngle, onLoad } = {}) {
    this.container = container;
    this.onAngle = onAngle;
    this.onLoad = onLoad;
    this.still = reducedMotion();
    this.hotspots = [];
    this.swimming = false;
    this.swim = 0; // eased 0..1 toward the target, never snapped
    this.lastAngle = null;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping; // tone curve is applied in the fish materials
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 20);

    // Background quad, drawn first.
    this.bgUniforms = { uTime: shared.uTime, uAspect: { value: 1 } };
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: BG_VS, fragmentShader: BG_FS, uniforms: this.bgUniforms, depthTest: false, depthWrite: false }),
    );
    bg.frustumCulled = false;
    bg.renderOrder = -1000;
    scene.add(bg);

    // Lights: key first so it is directional light 0 in the shader (caustics target it).
    const linear = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
    const key = new THREE.DirectionalLight(linear(1.9, 2.15, 2.05), 1);
    key.position.set(-0.35, 1, 0.5);
    const fill = new THREE.DirectionalLight(linear(0.22, 0.5, 0.55), 1);
    fill.position.set(0.7, 0.15, -0.6);
    scene.add(key, key.target, fill, fill.target);
    scene.add(new THREE.HemisphereLight(linear(0.2, 0.42, 0.44), linear(0.05, 0.09, 0.08), 1));

    // Marine snow: after opaque objects, before the transparent fins.
    const positions = new Float32Array(SNOW_COUNT * 3);
    const weights = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
      weights[i] = 0.6 + Math.random() * 1.8;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    snowGeo.setAttribute('aW', new THREE.BufferAttribute(weights, 1));
    this.snowUniforms = { uTime: shared.uTime, uViewportH: { value: 1 } };
    const snow = new THREE.Points(
      snowGeo,
      new THREE.ShaderMaterial({
        vertexShader: SNOW_VS,
        fragmentShader: SNOW_FS,
        uniforms: this.snowUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    snow.frustumCulled = false;
    snow.renderOrder = 1;
    scene.add(snow);
    this.disposables = [bg.geometry, bg.material, snowGeo, snow.material];

    // Camera and controls.
    this.startView = startView;
    this.radius = DEFAULT_DISTANCE;
    this.camera.position.copy(fromSpherical(startView[0], startView[1], this.radius));
    const controls = new OrbitControls(this.camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 0.4;
    controls.maxDistance = 2;
    controls.autoRotate = !this.still;
    controls.autoRotateSpeed = (TURNTABLE_RAD_PER_S * 60) / (2 * Math.PI);
    // First user drag stops the turntable and any preset animation, for good.
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
      this.tween = null;
      this.target = null;
    });
    this.controls = controls;

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.visible = true;
    this.intersection = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
    });
    this.intersection.observe(container);

    this.lastFrame = performance.now();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.bgUniforms.uAspect.value = aspect;
    this.snowUniforms.uViewportH.value = h * this.renderer.getPixelRatio();
    // Keep the whole fish in frame on narrow (portrait) viewports.
    const fit = HALF_WIDTH / (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect);
    const radius = Math.max(DEFAULT_DISTANCE, fit);
    if (Math.abs(radius - this.radius) > 1e-3) {
      this.camera.position.setLength(radius);
      this.radius = radius;
    }
  }

  async load(url) {
    const token = (this.loadToken = Symbol());
    const gltf = await loadModel(url);
    if (token !== this.loadToken || !this.renderer) return;
    if (this.fish) this.scene.remove(this.fish);
    this.mixer?.stopAllAction();

    const fish = gltf.scene.clone(true);
    this.vertexSwim = gltf.userData.vertexSwim;
    fish.traverse((o) => {
      if (!o.isMesh) return;
      if ([].concat(o.material).some((m) => m.transparent)) o.renderOrder = 2; // fins after body and snow
      if (this.vertexSwim) o.frustumCulled = false; // the tail moves outside the static bounds
    });
    this.scene.add(fish);
    this.fish = fish;
    this.mixer = new THREE.AnimationMixer(fish);
    // Older exports without _swim fall back to their baked "Swim" clip.
    const clip = this.vertexSwim ? null : gltf.animations.find((a) => a.name === 'Swim');
    this.swimAction = clip ? this.mixer.clipAction(clip) : null;
    if (this.swimming) this.swimAction?.play();
    this.attachHotspots();
    this.onLoad?.({ hasSwim: !this.still && (this.vertexSwim || Boolean(clip)) });
  }

  setSwimming(on) {
    this.swimming = on; // vertex swim eases toward this in tick()
    if (!this.swimAction) return;
    if (on) this.swimAction.reset().play();
    else this.swimAction.stop(); // stopping restores the rest pose
  }

  // Animate the camera to [theta, phi] degrees (model-viewer style orbit angles).
  setView(theta, phi) {
    const from = this.currentAngles();
    // Take the short way round for presets.
    const dTheta = ((((theta - from[0]) % 360) + 540) % 360) - 180;
    this.animateTo([from[0] + dTheta, phi]);
  }

  rotate(delta) {
    const base = this.target ?? this.currentAngles();
    this.animateTo([base[0] + delta, base[1]]);
  }

  animateTo(target) {
    this.controls.autoRotate = false;
    this.target = target;
    this.tween = { from: this.currentAngles(), to: target, start: performance.now(), duration: this.still ? 0 : 500 };
  }

  currentAngles() {
    const s = new THREE.Spherical().setFromVector3(this.camera.position);
    return [THREE.MathUtils.radToDeg(s.theta), THREE.MathUtils.radToDeg(s.phi)];
  }

  // hotspots: [{ el, position: "x y z", normal: "x y z" }] in scene units at rest.
  setHotspots(hotspots) {
    this.hotspots = hotspots.map((h) => ({
      el: h.el,
      local: new THREE.Vector3(...h.position.split(' ').map(Number)),
      normal: new THREE.Vector3(...h.normal.split(' ').map(Number)).normalize(),
    }));
    this.attachHotspots();
  }

  attachHotspots() {
    if (!this.fish) return;
    // Vertex swim: anchor in model units under the mesh root so the JS body offset matches the shader.
    let meshRoot = null;
    this.fish.traverse((o) => {
      if (!meshRoot && o.isMesh) meshRoot = o.parent;
    });
    const parent = this.vertexSwim ? meshRoot : this.fish.getObjectByName('Swim') ?? this.fish;
    this.fish.position.y = 0;
    this.fish.updateMatrixWorld(true);
    for (const h of this.hotspots) {
      h.anchor?.removeFromParent();
      h.anchor = new THREE.Object3D();
      h.base = this.vertexSwim ? parent.worldToLocal(h.local.clone()) : h.local.clone();
      h.anchor.position.copy(h.base);
      parent.add(h.anchor);
    }
  }

  tick() {
    const now = performance.now();
    const delta = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    if (!this.visible || document.hidden) return;
    const t = this.still ? FROZEN_TIME : (performance.now() - clockStart) / 1000;
    shared.uTime.value = t;

    // Vertex swim does its own idle bob in the shader; older exports bob the whole fish.
    if (this.fish && !this.vertexSwim) this.fish.position.y = this.still ? 0 : 0.0021 * Math.sin(t * 0.9);
    this.mixer?.update(delta);
    const swimTarget = this.swimming && !this.still ? 1 : 0;
    this.swim += (swimTarget - this.swim) * Math.min(1, delta * 2);

    if (this.tween) {
      const { from, to, start, duration } = this.tween;
      const k = duration ? Math.min((performance.now() - start) / duration, 1) : 1;
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const radius = this.camera.position.length();
      this.camera.position.copy(fromSpherical(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, radius));
      if (k >= 1) this.tween = null;
    }
    this.controls.update(delta);
    swimUniforms.uSwim.value = this.swim;
    swimUniforms.uIdle.value = this.still ? 0 : 1;
    this.renderer.render(this.scene, this.camera);

    this.updateHotspots();
    const angle = Math.round(((THREE.MathUtils.radToDeg(this.controls.getAzimuthalAngle()) % 360) + 360) % 360);
    if (angle !== this.lastAngle) {
      this.lastAngle = angle;
      this.onAngle?.(angle);
    }
  }

  updateHotspots() {
    if (!this.hotspots.length) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const world = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const n = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const t = shared.uTime.value;
    const idle = this.still ? 0 : 1;
    for (const spot of this.hotspots) {
      if (!spot.anchor || !spot.el) continue;
      if (this.vertexSwim) {
        const { dz, dy } = swimOffset(spot.base.x, t, this.swim, idle);
        spot.anchor.position.set(spot.base.x, spot.base.y + dy, spot.base.z + dz);
      }
      spot.anchor.getWorldPosition(world);
      spot.anchor.parent.getWorldQuaternion(q);
      n.copy(spot.normal).applyQuaternion(q);
      const facing = n.dot(toCamera.subVectors(this.camera.position, world)) > 0;
      world.project(this.camera);
      const x = (world.x * 0.5 + 0.5) * w;
      const y = (-world.y * 0.5 + 0.5) * h;
      spot.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      spot.el.style.opacity = facing ? '1' : '0.15';
    }
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    this.controls.dispose();
    this.mixer?.stopAllAction();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.renderer = null;
  }
}
