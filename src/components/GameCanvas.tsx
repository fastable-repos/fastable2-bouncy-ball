import { useEffect, useRef, useCallback } from 'react'
import type { LevelConfig, BallState, GamePhase, ScoreBreakdown } from '../lib/types'
import { stepPhysics, checkStarCollection, checkGoalEntry, simulateTrajectory } from '../lib/physics'
import { calculateScore } from '../lib/storage'
import {
  BALL_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAUNCH_POWER,
  MAX_DRAG_DIST,
  STAR_RADIUS,
} from '../lib/levels'

interface GameCanvasProps {
  level: LevelConfig
  phase: GamePhase
  gameKey: number
  onPhaseChange: (phase: GamePhase) => void
  onBounceUpdate: (count: number) => void
  onStarCollect: (index: number) => void
  onTimeUpdate: (time: number) => void
  onWin: (score: ScoreBreakdown, stars: number) => void
  onLose: () => void
  starsCollectedRef: React.MutableRefObject<boolean[]>
  bouncesRef: React.MutableRefObject<number>
}

export default function GameCanvas({
  level,
  phase,
  gameKey,
  onPhaseChange,
  onBounceUpdate,
  onStarCollect,
  onTimeUpdate,
  onWin,
  onLose,
  starsCollectedRef,
  bouncesRef,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballRef = useRef<BallState>({
    x: level.ballStart.x,
    y: level.ballStart.y,
    vx: 0,
    vy: 0,
  })
  const trailRef = useRef<{ x: number; y: number }[]>([])
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragCurrentRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const phaseRef = useRef<GamePhase>(phase)
  const winFiredRef = useRef(false)
  const loseFiredRef = useRef(false)

  // Sync phase ref
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Reset when gameKey changes
  useEffect(() => {
    ballRef.current = { x: level.ballStart.x, y: level.ballStart.y, vx: 0, vy: 0 }
    trailRef.current = []
    dragStartRef.current = null
    dragCurrentRef.current = null
    bouncesRef.current = 0
    elapsedRef.current = 0
    startTimeRef.current = 0
    winFiredRef.current = false
    loseFiredRef.current = false
    starsCollectedRef.current = level.stars.map(() => false)
    onBounceUpdate(0)
    onTimeUpdate(0)
  }, [gameKey, level, bouncesRef, starsCollectedRef, onBounceUpdate, onTimeUpdate])

  const getCanvasPos = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (phaseRef.current !== 'aiming') return
      const pos = getCanvasPos(e)
      const ball = ballRef.current
      const dx = pos.x - ball.x
      const dy = pos.y - ball.y
      if (Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS * 3) {
        dragStartRef.current = { x: ball.x, y: ball.y }
        dragCurrentRef.current = pos
      }
    },
    [getCanvasPos]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (phaseRef.current !== 'aiming' || !dragStartRef.current) return
      dragCurrentRef.current = getCanvasPos(e)
    },
    [getCanvasPos]
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (phaseRef.current !== 'aiming' || !dragStartRef.current) return
      const end = getCanvasPos(e)
      const start = dragStartRef.current
      const dx = end.x - start.x
      const dy = end.y - start.y
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG_DIST)
      if (dist < 5) {
        dragStartRef.current = null
        dragCurrentRef.current = null
        return
      }
      const mag = Math.sqrt(dx * dx + dy * dy)
      const speed = dist * LAUNCH_POWER
      ballRef.current = {
        ...ballRef.current,
        vx: (dx / mag) * speed,
        vy: (dy / mag) * speed,
      }
      dragStartRef.current = null
      dragCurrentRef.current = null
      startTimeRef.current = performance.now()
      onPhaseChange('playing')
    },
    [getCanvasPos, onPhaseChange]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp])

  // Draw functions
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ball = ballRef.current
    const phase = phaseRef.current

    // Background
    ctx.fillStyle = '#0d1b2a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x < CANVAS_WIDTH; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke()
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke()
    }

    // Goal zone
    const goal = level.goal
    const grd = ctx.createRadialGradient(
      goal.x + goal.width / 2, goal.y + goal.height / 2, 0,
      goal.x + goal.width / 2, goal.y + goal.height / 2, Math.max(goal.width, goal.height)
    )
    grd.addColorStop(0, 'rgba(255,107,53,0.35)')
    grd.addColorStop(1, 'rgba(255,107,53,0.05)')
    ctx.fillStyle = grd
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height)
    ctx.strokeStyle = '#ff6b35'
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    ctx.strokeRect(goal.x, goal.y, goal.width, goal.height)
    ctx.setLineDash([])

    // Goal label
    ctx.fillStyle = '#ff6b35'
    ctx.font = 'bold 14px Orbitron, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('GOAL', goal.x + goal.width / 2, goal.y + goal.height / 2 + 5)
    ctx.textAlign = 'left'

    // Obstacles
    for (const obs of level.obstacles) {
      if (obs.type === 'rect') {
        ctx.fillStyle = '#4a4e69'
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 2
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height)
      } else {
        ctx.beginPath()
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#4a4e69'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // Stars
    const t = Date.now() / 1000
    level.stars.forEach((star, i) => {
      if (starsCollectedRef.current[i]) return
      const pulse = 1 + 0.15 * Math.sin(t * 3 + i)
      const r = STAR_RADIUS * pulse
      ctx.save()
      ctx.translate(star.x, star.y)
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 15
      drawStar(ctx, 0, 0, 5, r, r * 0.45)
      ctx.fillStyle = '#ffd700'
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()
    })

    // Trail
    const trail = trailRef.current
    for (let i = 0; i < trail.length; i++) {
      const alpha = i / trail.length * 0.5
      ctx.beginPath()
      ctx.arc(trail[i].x, trail[i].y, BALL_RADIUS * (i / trail.length) * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,245,255,${alpha})`
      ctx.fill()
    }

    // Ball
    ctx.save()
    ctx.shadowColor = '#00f5ff'
    ctx.shadowBlur = 25
    const ballGrd = ctx.createRadialGradient(
      ball.x - BALL_RADIUS * 0.3, ball.y - BALL_RADIUS * 0.3, BALL_RADIUS * 0.1,
      ball.x, ball.y, BALL_RADIUS
    )
    ballGrd.addColorStop(0, '#ffffff')
    ballGrd.addColorStop(0.3, '#00f5ff')
    ballGrd.addColorStop(1, '#0080ff')
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = ballGrd
    ctx.fill()
    ctx.restore()

    // Aiming overlay
    if (phase === 'aiming') {
      const ds = dragStartRef.current
      const dc = dragCurrentRef.current
      if (ds && dc) {
        const dx = dc.x - ds.x
        const dy = dc.y - ds.y
        const mag = Math.sqrt(dx * dx + dy * dy)
        const clampedDist = Math.min(mag, MAX_DRAG_DIST)

        // Trajectory preview
        const speed = clampedDist * LAUNCH_POWER
        const previewBall = {
          x: ball.x,
          y: ball.y,
          vx: mag > 0 ? (dx / mag) * speed : 0,
          vy: mag > 0 ? (dy / mag) * speed : 0,
        }
        const points = simulateTrajectory(previewBall, level.obstacles, 80)
        if (points.length > 1) {
          ctx.setLineDash([6, 6])
          ctx.strokeStyle = 'rgba(0,245,255,0.4)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (const p of points) ctx.lineTo(p.x, p.y)
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Arrow from ball
        const nx = mag > 0 ? dx / mag : 0
        const ny = mag > 0 ? dy / mag : 0
        const arrowLen = clampedDist * 0.8
        const ex = ball.x + nx * arrowLen
        const ey = ball.y + ny * arrowLen

        ctx.strokeStyle = '#00f5ff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(ball.x, ball.y)
        ctx.lineTo(ex, ey)
        ctx.stroke()

        // Arrowhead
        const angle = Math.atan2(ny, nx)
        ctx.fillStyle = '#00f5ff'
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - 12 * Math.cos(angle - 0.4), ey - 12 * Math.sin(angle - 0.4))
        ctx.lineTo(ex - 12 * Math.cos(angle + 0.4), ey - 12 * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fill()
      } else {
        // "Drag to aim" hint
        ctx.fillStyle = 'rgba(0,245,255,0.7)'
        ctx.font = '13px Orbitron, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('DRAG TO AIM', ball.x, ball.y + BALL_RADIUS + 24)
        ctx.textAlign = 'left'
      }
    }
  }, [level, starsCollectedRef])

  // Game loop
  useEffect(() => {
    let lastTime = performance.now()

    const loop = (now: number) => {
      const phase = phaseRef.current

      if (phase === 'playing') {
        elapsedRef.current = (now - startTimeRef.current) / 1000
        onTimeUpdate(elapsedRef.current)

        // Fixed timestep (16ms ≈ 60fps)
        const dt = now - lastTime
        const steps = Math.round(dt / 16.67)
        for (let s = 0; s < Math.min(steps, 3); s++) {
          const result = stepPhysics(ballRef.current, level.obstacles)
          ballRef.current = result.ball

          if (result.wallBounced || result.obstacleBounced) {
            bouncesRef.current += 1
            onBounceUpdate(bouncesRef.current)
          }

          // Star collection
          level.stars.forEach((star, i) => {
            if (!starsCollectedRef.current[i] && checkStarCollection(ballRef.current, star.x, star.y)) {
              starsCollectedRef.current[i] = true
              onStarCollect(i)
            }
          })

          // Trail
          trailRef.current.push({ x: ballRef.current.x, y: ballRef.current.y })
          if (trailRef.current.length > 18) trailRef.current.shift()

          // Win
          if (!winFiredRef.current && checkGoalEntry(ballRef.current, level.goal)) {
            winFiredRef.current = true
            const starsCount = starsCollectedRef.current.filter(Boolean).length
            const score = calculateScore(starsCount, bouncesRef.current, elapsedRef.current, level.maxBounces)
            onWin(score, starsCount)
            onPhaseChange('won')
            return
          }

          // Lose - out of bounds
          if (!loseFiredRef.current && result.outOfBounds) {
            loseFiredRef.current = true
            onLose()
            onPhaseChange('lost')
            return
          }

          // Lose - max bounces
          if (!loseFiredRef.current && bouncesRef.current > level.maxBounces) {
            loseFiredRef.current = true
            onLose()
            onPhaseChange('lost')
            return
          }
        }
      }

      lastTime = now
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [level, phase, draw, onBounceUpdate, onStarCollect, onTimeUpdate, onWin, onLose, onPhaseChange, bouncesRef, starsCollectedRef])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      data-testid="game-canvas"
      className="block cursor-crosshair"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    />
  )
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
) {
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outerR)
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR)
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR)
    rot += step
  }
  ctx.lineTo(cx, cy - outerR)
  ctx.closePath()
}
