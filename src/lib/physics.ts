import type { BallState, Obstacle, RectObstacle, CircleObstacle } from './types'
import {
  BALL_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRAVITY,
  RESTITUTION,
  STAR_RADIUS,
} from './levels'

export interface StepResult {
  ball: BallState
  wallBounced: boolean
  obstacleBounced: boolean
  outOfBounds: boolean
}

export function stepPhysics(
  ball: BallState,
  obstacles: Obstacle[]
): StepResult {
  let { x, y, vx, vy } = ball
  let wallBounced = false
  let obstacleBounced = false

  // Apply gravity
  vy += GRAVITY

  // Update position
  x += vx
  y += vy

  // Left wall
  if (x - BALL_RADIUS < 0) {
    x = BALL_RADIUS
    vx = Math.abs(vx) * RESTITUTION
    wallBounced = true
  }
  // Right wall
  if (x + BALL_RADIUS > CANVAS_WIDTH) {
    x = CANVAS_WIDTH - BALL_RADIUS
    vx = -Math.abs(vx) * RESTITUTION
    wallBounced = true
  }
  // Ceiling
  if (y - BALL_RADIUS < 0) {
    y = BALL_RADIUS
    vy = Math.abs(vy) * RESTITUTION
    wallBounced = true
  }

  // Obstacle collisions
  let current: BallState = { x, y, vx, vy }
  for (const obs of obstacles) {
    const result =
      obs.type === 'rect'
        ? resolveRectCollision(current, obs)
        : resolveCircleObstacleCollision(current, obs)
    if (result.bounced) {
      current = result.ball
      obstacleBounced = true
    }
  }

  const outOfBounds = current.y - BALL_RADIUS > CANVAS_HEIGHT

  return {
    ball: current,
    wallBounced,
    obstacleBounced,
    outOfBounds,
  }
}

function resolveRectCollision(
  ball: BallState,
  rect: RectObstacle
): { ball: BallState; bounced: boolean } {
  const { x, y, vx, vy } = ball
  const r = BALL_RADIUS

  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width))
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height))

  const dx = x - closestX
  const dy = y - closestY
  const distSq = dx * dx + dy * dy

  if (distSq < r * r && distSq > 0) {
    const dist = Math.sqrt(distSq)
    const nx = dx / dist
    const ny = dy / dist
    const penetration = r - dist
    const newX = x + nx * penetration
    const newY = y + ny * penetration
    const dot = vx * nx + vy * ny
    const newVx = (vx - 2 * dot * nx) * RESTITUTION
    const newVy = (vy - 2 * dot * ny) * RESTITUTION
    return { ball: { x: newX, y: newY, vx: newVx, vy: newVy }, bounced: true }
  }

  return { ball, bounced: false }
}

function resolveCircleObstacleCollision(
  ball: BallState,
  circle: CircleObstacle
): { ball: BallState; bounced: boolean } {
  const { x, y, vx, vy } = ball
  const r = BALL_RADIUS

  const dx = x - circle.x
  const dy = y - circle.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = r + circle.radius

  if (dist < minDist && dist > 0) {
    const nx = dx / dist
    const ny = dy / dist
    const penetration = minDist - dist
    const newX = x + nx * penetration
    const newY = y + ny * penetration
    const dot = vx * nx + vy * ny
    const newVx = (vx - 2 * dot * nx) * RESTITUTION
    const newVy = (vy - 2 * dot * ny) * RESTITUTION
    return { ball: { x: newX, y: newY, vx: newVx, vy: newVy }, bounced: true }
  }

  return { ball, bounced: false }
}

export function checkStarCollection(
  ball: BallState,
  starX: number,
  starY: number
): boolean {
  const dx = ball.x - starX
  const dy = ball.y - starY
  return Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS + STAR_RADIUS
}

export function checkGoalEntry(
  ball: BallState,
  goal: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    ball.x + BALL_RADIUS > goal.x &&
    ball.x - BALL_RADIUS < goal.x + goal.width &&
    ball.y + BALL_RADIUS > goal.y &&
    ball.y - BALL_RADIUS < goal.y + goal.height
  )
}

export function simulateTrajectory(
  ball: BallState,
  obstacles: Obstacle[],
  steps = 90
): Vec2[] {
  const points: Vec2[] = []
  let current = { ...ball }

  for (let i = 0; i < steps; i++) {
    const result = stepPhysics(current, obstacles)
    current = result.ball
    if (result.outOfBounds) break
    if (i % 4 === 0) points.push({ x: current.x, y: current.y })
  }

  return points
}

interface Vec2 {
  x: number
  y: number
}
