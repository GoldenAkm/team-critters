// Moving light and particles over the landing page's background photos:
// sunbeams through the kelp, bubbles at midwater and marine snow in the deep.
// All three are drawn on one canvas behind the page content, and
// OceanBackground sets how much of each shows as the photos crossfade.

const TAU = Math.PI * 2

function random(min, max) {
  return min + Math.random() * (max - min)
}

// Paints a shape once so it can be stamped cheaply every frame
function makeSprite(width, height, paint) {
  const sprite = document.createElement('canvas')
  sprite.width = width
  sprite.height = height
  paint(sprite.getContext('2d'), width, height)
  return sprite
}

// Adds or removes items so a list has as many as the screen size needs
function setCount(list, count, create) {
  while (list.length < count) list.push(create())
  list.length = count
}

// Sunbeams: soft shafts of light from the surface, fanning out from a sun far
// above the screen. Each beam fades in, shimmers, drifts a little and fades out.
const SUN_X = 0.62 // share of the screen width
const SUN_DISTANCE = 1.8 // above the top edge, in screen sizes
const BEAM_BRIGHTNESS = 0.5

function makeBeamSprite() {
  return makeSprite(32, 256, (g, width, height) => {
    const image = g.createImageData(width, height)
    for (let y = 0; y < height; y++) {
      const along = y / (height - 1) // 0 at the surface, 1 at the far end
      const start = Math.min(along / 0.15, 1)
      const fade = start * start * (3 - 2 * start) * (1 - along) ** 1.2
      const halfWidth = 0.55 + 0.45 * along // widens with depth
      for (let x = 0; x < width; x++) {
        const across = ((x + 0.5) / width) * 2 - 1
        const alpha = fade * Math.exp(-2.5 * (across / halfWidth) ** 2)
        image.data.set([214, 246, 236, 255 * alpha], (y * width + x) * 4)
      }
    }
    g.putImageData(image, 0, 0)
  })
}

function newBeam(life = Math.random()) {
  const glow = Math.random() < 0.2 // a few wide, faint beams between the sharper ones
  return {
    // Where it meets the top edge, as a share of the width; most are near the sun
    x: SUN_X + (Math.random() + Math.random() - 1) * 0.8,
    width: glow ? random(12, 20) : random(2.5, 8), // hundredths of the larger screen side
    length: random(0.6, 1.1), // share of the screen height
    strength: random(0.35, 0.8) * (glow ? 0.5 : 1),
    life, // 0 to 1: fades in, then out
    lifespan: random(8, 18), // seconds
    drift: random(-0.04, 0.04), // sideways movement over its life, share of the width
    shimmer: random(0.15, 0.5), // flickers per second
    phase: random(0, TAU),
  }
}

function createSunbeams() {
  const sprite = makeBeamSprite()
  const beams = []
  // The beams are soft, so they're drawn at a quarter of the size and scaled
  // up: it looks the same and is far less work every frame
  const layer = document.createElement('canvas')
  const layerCtx = layer.getContext('2d')
  const scale = 0.25

  return {
    resize(width, height) {
      layer.width = Math.ceil(width * scale)
      layer.height = Math.ceil(height * scale)
      setCount(beams, Math.round(10 + width / 100), newBeam)
    },
    draw(ctx, { width, height, time, dt }, amount) {
      const unit = Math.max(width, height) / 100
      const sunX = SUN_X * width
      const sunDistance = SUN_DISTANCE * Math.max(width, height)
      // Clear the whole layer in its own pixels: it is rounded up, so clearing width x height at this scale
      // could leave its last column uncleared, where the beams would pile up into a bright bar
      layerCtx.setTransform(1, 0, 0, 1, 0, 0)
      layerCtx.clearRect(0, 0, layer.width, layer.height)
      layerCtx.setTransform(scale, 0, 0, scale, 0, 0)
      layerCtx.globalCompositeOperation = 'lighter'
      for (const beam of beams) {
        beam.life += dt / beam.lifespan
        if (beam.life >= 1) Object.assign(beam, newBeam(0))
        const x =
          (beam.x + beam.drift * beam.life) * width + Math.sin(time * 0.3 + beam.phase) * unit
        const shimmer = 0.75 + 0.25 * Math.sin((time * beam.shimmer + beam.phase) * TAU)
        const length = beam.length * height
        const beamWidth = beam.width * unit
        layerCtx.globalAlpha =
          BEAM_BRIGHTNESS * beam.strength * Math.sin(Math.PI * beam.life) * shimmer
        layerCtx.save()
        layerCtx.translate(x, -0.1 * length)
        layerCtx.rotate(-Math.atan2(x - sunX, sunDistance)) // pointing away from the sun
        layerCtx.drawImage(sprite, -beamWidth / 2, 0, beamWidth, length)
        layerCtx.restore()
      }
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = amount
      ctx.drawImage(layer, 0, 0, width * scale, height * scale, 0, 0, width, height)
    },
  }
}

// Bubbles: a few strays rising all the time, plus the odd stream from below.
// Closer bubbles look bigger, rise faster and are out of focus.
const BUBBLE_OPACITY = [0.85, 0.9, 0.7, 0.45] // tiny point, then sharp, soft, blurred

// Too small to show a rim: just a point of light
function makeBubbleDot() {
  return makeSprite(16, 16, (g, size) => {
    const r = size / 2
    const dot = g.createRadialGradient(r, r, 0, r, r, r)
    dot.addColorStop(0, 'rgba(235, 250, 255, 1)')
    dot.addColorStop(0.4, 'rgba(235, 250, 255, 0.6)')
    dot.addColorStop(1, 'rgba(235, 250, 255, 0)')
    g.fillStyle = dot
    g.fillRect(0, 0, size, size)
  })
}

function makeBubbleSprite(blur) {
  return makeSprite(64, 64, (g, size) => {
    const r = size / 2
    // Bright rim where light bends at the bubble's edge
    const rim = g.createRadialGradient(r, r, 0, r, r, r)
    rim.addColorStop(0, 'rgba(225, 245, 255, 0.05)')
    rim.addColorStop(0.62 - blur * 0.2, 'rgba(225, 245, 255, 0.1)')
    rim.addColorStop(0.9 - blur * 0.12, `rgba(235, 250, 255, ${0.95 - blur * 0.5})`)
    rim.addColorStop(1, 'rgba(235, 250, 255, 0)')
    g.fillStyle = rim
    g.fillRect(0, 0, size, size)
    // Light from above shines through and gathers at the bottom, so the
    // top of the rim is dimmer
    const shadow = g.createLinearGradient(0, 0, 0, size * 0.7)
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.65)')
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.globalCompositeOperation = 'destination-out'
    g.fillStyle = shadow
    g.fillRect(0, 0, size, size)
    g.globalCompositeOperation = 'source-over'
    // Glints: the light above reflected near the top, and a faint one below
    for (const [x, y, radius, alpha] of [
      [0.66, 0.58, 0.24, 1],
      [1.36, 1.4, 0.12, 0.45],
    ]) {
      const spread = r * (radius + blur * 0.15)
      const glint = g.createRadialGradient(r * x, r * y, 0, r * x, r * y, spread)
      glint.addColorStop(0, `rgba(255, 255, 255, ${alpha * (1 - blur * 0.55)})`)
      glint.addColorStop(1, 'rgba(255, 255, 255, 0)')
      g.fillStyle = glint
      g.fillRect(0, 0, size, size)
    }
  })
}

function newBubble(width, height, { x = random(0, width), y = random(0, height), small } = {}) {
  const z = Math.random() ** 2 * (small ? 0.6 : 1) // 0 far away, 1 right by the camera
  const radius = 1.4 + z * 6 + random(0, 0.8)
  return {
    x,
    y,
    z,
    radius,
    rise: 30 + radius * 14 + random(-5, 5), // pixels per second
    drift: random(-5, 5),
    wobble: 0.5 + radius * random(0.3, 0.8),
    wobbleRate: random(4, 9),
    phase: random(0, TAU),
    sprite: radius < 2.2 ? 0 : z > 0.7 ? 3 : z > 0.4 ? 2 : 1,
  }
}

function createBubbles() {
  const sprites = [makeBubbleDot(), ...[0, 0.5, 1].map(makeBubbleSprite)]
  const strays = []
  let streams = []
  let nextStream = 1 // seconds

  return {
    resize(width, height) {
      setCount(strays, Math.round((width * height) / 26000), () => newBubble(width, height))
    },
    draw(ctx, { width, height, time, dt, scroll }, amount) {
      nextStream -= dt
      if (nextStream <= 0) {
        nextStream = random(2.5, 6)
        const x = random(0.1, 0.9) * width
        let y = height
        for (let count = Math.round(random(6, 14)); count > 0; count--) {
          y += random(10, 28)
          streams.push(newBubble(width, height, { x: x + random(-4, 4), y, small: true }))
        }
      }

      ctx.globalCompositeOperation = 'lighter'
      const step = (bubble) => {
        bubble.y -= bubble.rise * dt + scroll * (0.1 + 0.3 * bubble.z)
        bubble.x += bubble.drift * dt
        if (bubble.y > height * 1.5) bubble.y -= height * 1.5 // pushed down by scrolling up
        const x = bubble.x + Math.sin(time * bubble.wobbleRate + bubble.phase) * bubble.wobble
        const { radius } = bubble
        ctx.globalAlpha = amount * BUBBLE_OPACITY[bubble.sprite]
        ctx.drawImage(sprites[bubble.sprite], x - radius, bubble.y - radius, radius * 2, radius * 2)
      }
      for (const bubble of strays) {
        // Gone off the top: start again below the screen
        if (bubble.y < -bubble.radius * 3) {
          Object.assign(bubble, newBubble(width, height, { y: height + random(10, height * 0.4) }))
        }
        step(bubble)
      }
      streams = streams.filter((bubble) => bubble.y > -bubble.radius * 3)
      streams.forEach(step)
    },
  }
}

// Marine snow: specks of organic matter sinking slowly and drifting with the
// current. The few right by the camera are big, faint and out of focus.
function makeSnowSprite(outOfFocus) {
  return makeSprite(32, 32, (g, size) => {
    const r = size / 2
    const color = '255, 248, 238'
    const glow = g.createRadialGradient(r, r, 0, r, r, r)
    if (outOfFocus) {
      glow.addColorStop(0, `rgba(${color}, 0.45)`)
      glow.addColorStop(0.75, `rgba(${color}, 0.4)`)
      glow.addColorStop(0.9, `rgba(${color}, 0.5)`)
    } else {
      glow.addColorStop(0, `rgba(${color}, 1)`)
      glow.addColorStop(0.25, `rgba(${color}, 0.9)`)
      glow.addColorStop(0.5, `rgba(${color}, 0.45)`)
      glow.addColorStop(0.75, `rgba(${color}, 0.12)`)
    }
    glow.addColorStop(1, `rgba(${color}, 0)`)
    g.fillStyle = glow
    g.fillRect(0, 0, size, size)
  })
}

function newFlake(width, height) {
  const z = Math.random() ** 1.6 // 0 far away, 1 right by the camera
  const nearCamera = z > 0.92
  return {
    x: random(0, width),
    y: random(0, height),
    z,
    // Drawn size; the bright core is about half of it
    size: nearCamera ? random(12, 28) : 2.2 + z * 6 + random(0, 1.5),
    alpha: nearCamera ? random(0.12, 0.25) : 0.45 + z * 0.5,
    sink: 3 + z * 11 + random(0, 3), // pixels per second
    sway: 3 + z * 10,
    swayRate: random(0.15, 0.45),
    twinkle: random(0.6, 2),
    phase: random(0, TAU),
    sprite: nearCamera ? 1 : 0,
  }
}

function createMarineSnow() {
  const sprites = [makeSnowSprite(false), makeSnowSprite(true)]
  const flakes = []

  return {
    resize(width, height) {
      setCount(flakes, Math.round((width * height) / 5000), () => newFlake(width, height))
    },
    draw(ctx, { width, height, time, dt, scroll }, amount) {
      const current = 3 * Math.sin(time * 0.07) + 2 * Math.sin(time * 0.023 + 1) // slow, shared
      ctx.globalCompositeOperation = 'lighter'
      for (const flake of flakes) {
        const { size } = flake
        flake.y += flake.sink * dt - scroll * (0.1 + 0.3 * flake.z)
        flake.x += current * (0.4 + flake.z) * dt
        // Wrap around the edges, just out of sight so none pop in
        if (flake.y > height + size || flake.y < -size) {
          flake.y = flake.y > 0 ? -size : height + size
          flake.x = random(0, width)
        }
        if (flake.x > width + size) flake.x -= width + 2 * size
        else if (flake.x < -size) flake.x += width + 2 * size
        const x = flake.x + Math.sin(time * flake.swayRate + flake.phase) * flake.sway
        ctx.globalAlpha =
          amount * flake.alpha * (0.8 + 0.2 * Math.sin(time * flake.twinkle + flake.phase))
        ctx.drawImage(sprites[flake.sprite], x - size / 2, flake.y - size / 2, size, size)
      }
    },
  }
}

// Starts drawing on the canvas. setMix takes how much of each effect to show
// ({ sunbeams, bubbles, snow }, each 0 to 1) and the current scroll position,
// which nudges the particles so they drift past as you scroll.
export function startOceanEffects(canvas) {
  const ctx = canvas.getContext('2d')
  // With reduced motion the scene is drawn once and stays still
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const effects = {
    sunbeams: createSunbeams(),
    bubbles: createBubbles(),
    snow: createMarineSnow(),
  }
  const mix = { sunbeams: 1, bubbles: 0, snow: 0 }
  const view = { width: 0, height: 0, dpr: 1, time: 0, dt: 0, scroll: 0 }
  let scrollY = window.scrollY
  let drawnScrollY = scrollY
  let lastFrame = performance.now()
  let frame = 0

  const draw = (now) => {
    frame = 0
    view.dt = reduceMotion ? 0 : Math.min((now - lastFrame) / 1000, 0.1)
    view.time += view.dt
    view.scroll = reduceMotion ? 0 : Math.max(-150, Math.min(scrollY - drawnScrollY, 150))
    lastFrame = now
    drawnScrollY = scrollY
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0)
    ctx.clearRect(0, 0, view.width, view.height)
    for (const [name, effect] of Object.entries(effects)) {
      if (mix[name] > 0) effect.draw(ctx, view, mix[name])
    }
    if (!reduceMotion) frame = requestAnimationFrame(draw)
  }
  const requestDraw = () => {
    if (!frame) frame = requestAnimationFrame(draw)
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const { clientWidth: width, clientHeight: height } = canvas
    if (width === view.width && height === view.height && dpr === view.dpr) return
    Object.assign(view, { width, height, dpr })
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    for (const effect of Object.values(effects)) effect.resize(width, height)
    requestDraw()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  return {
    setMix(amounts, newScrollY) {
      Object.assign(mix, amounts)
      scrollY = newScrollY
      requestDraw()
    },
    stop() {
      cancelAnimationFrame(frame)
      observer.disconnect()
    },
  }
}
