import { useEffect, useRef } from 'react'

const rgbFor = (color, theme) => {
  if (/^#[0-9a-f]{6}$/i.test(color || '')) return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16)).join(',')
  return theme === 'light' ? '56,72,91' : '218,228,239'
}

const nodeShapes = ['dots', 'squares', 'diamonds', 'triangles']

export default function AnimatedNetworkCanvas({ active, theme, refreshing = false, settings }) {
  const canvasRef = useRef(null)
  const refreshingRef = useRef(refreshing)
  const settingsRef = useRef(settings)
  const density = settings?.density ?? 1

  useEffect(() => {
    refreshingRef.current = refreshing
  }, [refreshing])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    if (!active) {
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      return undefined
    }

    let width = 0
    let height = 0
    let pixelRatio = 1
    let points = []
    let frameId = 0
    let lastFrameTime = 0
    let lastDrawTime = 0
    let speedFactor = 1
    let flashLevel = 0
    let lastMovement = settingsRef.current?.movement ?? 'drift'
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      const count = Math.max(18, Math.min(150, Math.floor((width * height) / 26000 * (settingsRef.current?.density ?? 1))))
      points = Array.from({ length: count }, () => {
        const x = Math.random() * width
        const y = Math.random() * height
        const phase = Math.random() * Math.PI * 2
        return {
          x, y, anchorX: x, anchorY: y,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.5) * 14,
          phase,
          movePhase: phase,
          orbitRadius: 8 + Math.random() * 28,
          waveRange: 14 + Math.random() * 42,
        }
      })
      if (motionPreference.matches) draw(0, false)
    }

    const drawShape = (x, y, radius, shape) => {
      context.beginPath()
      if (shape === 'squares') {
        context.rect(x - radius, y - radius, radius * 2, radius * 2)
      } else if (shape === 'diamonds') {
        context.moveTo(x, y - radius * 1.35)
        context.lineTo(x + radius, y)
        context.lineTo(x, y + radius * 1.35)
        context.lineTo(x - radius, y)
        context.closePath()
      } else if (shape === 'triangles') {
        context.moveTo(x, y - radius * 1.35)
        context.lineTo(x + radius * 1.15, y + radius)
        context.lineTo(x - radius * 1.15, y + radius)
        context.closePath()
      } else {
        context.arc(x, y, radius, 0, Math.PI * 2)
      }
      context.fill()
    }

    const draw = (time, allowMotion = true) => {
      const elapsed = lastDrawTime ? Math.min((time - lastDrawTime) / 1000, 0.05) : 0
      lastDrawTime = time || lastDrawTime
      const currentSettings = settingsRef.current || {}
      const isRefreshing = refreshingRef.current
      const size = currentSettings.size ?? 1
      const speed = currentSettings.speed ?? 1
      const lineAmount = currentSettings.lineAmount ?? 1
      const movement = currentSettings.movement ?? 'drift'
      const shape = currentSettings.shape ?? 'dots'
      const easing = Math.min(1, elapsed * 2.5)
      speedFactor += ((isRefreshing ? 5.5 * speed : speed) - speedFactor) * easing
      flashLevel += ((isRefreshing ? 1 : 0) - flashLevel) * Math.min(1, elapsed * 2.4)
      context.clearRect(0, 0, width, height)
      const maxDistance = Math.max(85, Math.min(165, width * 0.18)) * Math.sqrt(lineAmount)
      const pulseRate = movement === 'still' && !isRefreshing ? 0 : 1.2 * speed + flashLevel * 11.4
      const strokeRgb = rgbFor(currentSettings.color, theme)

      if (movement !== lastMovement) {
        for (const point of points) {
          point.anchorX = point.x
          point.anchorY = point.y
          point.movePhase = point.phase
        }
        lastMovement = movement
      }

      if (allowMotion && elapsed > 0) {
        for (let i = 0; i < points.length; i += 1) {
          const point = points[i]
          const rate = speedFactor * (0.72 + (i % 5) * 0.12)
          if (movement === 'drift') {
            point.x += point.vx * elapsed * rate
            point.y += point.vy * elapsed * rate
            if (point.x < -12 || point.x > width + 12) point.vx *= -1
            if (point.y < -12 || point.y > height + 12) point.vy *= -1
            point.x = Math.max(-12, Math.min(width + 12, point.x))
            point.y = Math.max(-12, Math.min(height + 12, point.y))
          } else if (movement === 'orbit') {
            point.movePhase += elapsed * rate
            point.x = point.anchorX + Math.cos(point.movePhase) * point.orbitRadius
            point.y = point.anchorY + Math.sin(point.movePhase) * point.orbitRadius
          } else if (movement === 'wave') {
            point.movePhase += elapsed * rate
            point.x = point.anchorX + Math.sin(point.movePhase * 0.55) * point.waveRange
            point.y = point.anchorY + Math.sin(point.movePhase) * point.waveRange * 0.48
          }
        }
      }

      if (maxDistance > 0) {
        for (let i = 0; i < points.length; i += 1) {
          const point = points[i]
          for (let j = i + 1; j < points.length; j += 1) {
            const other = points[j]
            const dx = point.x - other.x
            const dy = point.y - other.y
            const distance = Math.hypot(dx, dy)
            if (distance >= maxDistance) continue
            const proximity = 1 - distance / maxDistance
            const flicker = (Math.sin(time * 0.001 * pulseRate + point.phase + other.phase) + 1) / 2
            const opacity = proximity * (0.24 + flashLevel * (0.08 + flicker * 0.37))
            context.beginPath()
            context.moveTo(point.x, point.y)
            context.lineTo(other.x, other.y)
            context.strokeStyle = `rgba(${strokeRgb},${opacity.toFixed(3)})`
            context.lineWidth = (0.8 + flashLevel * flicker * 1.1) * size
            context.stroke()
          }
        }
      }

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i]
        const pulse = (Math.sin(time * 0.001 * pulseRate + point.phase) + 1) / 2
        const radius = (1.1 + pulse * (0.55 + flashLevel * 1.9)) * size
        const selectedShape = shape === 'mixed' ? nodeShapes[i % nodeShapes.length] : shape
        context.fillStyle = `rgba(${strokeRgb},${(0.3 + pulse * 0.25 + flashLevel * (0.15 + pulse * 0.27)).toFixed(3)})`
        drawShape(point.x, point.y, radius, selectedShape)
      }
    }

    const animate = (time) => {
      frameId = 0
      if (!active || document.hidden || motionPreference.matches) return
      if (time - lastFrameTime >= 32) {
        draw(time)
        lastFrameTime = time
      }
      frameId = window.requestAnimationFrame(animate)
    }
    const start = () => {
      if (!active || document.hidden || motionPreference.matches || frameId) return
      lastFrameTime = 0
      lastDrawTime = 0
      frameId = window.requestAnimationFrame(animate)
    }
    const stop = () => {
      if (!frameId) return
      window.cancelAnimationFrame(frameId)
      frameId = 0
    }
    const onVisibilityChange = () => {
      if (document.hidden) stop()
      else start()
    }
    const onMotionPreferenceChange = () => {
      if (motionPreference.matches) {
        stop()
        lastDrawTime = 0
        draw(0, false)
      } else start()
    }

    resize()
    if (!motionPreference.matches) start()
    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    motionPreference.addEventListener?.('change', onMotionPreferenceChange)

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      motionPreference.removeEventListener?.('change', onMotionPreferenceChange)
    }
  }, [active, density, theme])

  return <canvas ref={canvasRef} className={`network-canvas${active ? ' is-on' : ''}${active && refreshing ? ' is-refreshing' : ''}`} aria-hidden="true" />
}
