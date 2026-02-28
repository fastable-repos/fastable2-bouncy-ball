import type { LevelConfig } from './types'

export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 560
export const BALL_RADIUS = 14
export const GRAVITY = 0.3
export const RESTITUTION = 0.75
export const LAUNCH_POWER = 0.12
export const MAX_DRAG_DIST = 150
export const STAR_RADIUS = 16

// Level 1: The Launch Pad — easy intro, no obstacles
// Ball at (100,300), goal at (340,230,140,130)
// Intended launch: drag from (100,300) to (167,258) → vx≈8, vy≈-5
// Ball arcs and enters goal at ~frame 31
export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'The Launch Pad',
    ballStart: { x: 100, y: 300 },
    obstacles: [],
    stars: [
      { x: 200, y: 255 },
      { x: 260, y: 235 },
      { x: 310, y: 255 },
    ],
    goal: { x: 340, y: 230, width: 140, height: 130 },
    maxBounces: 20,
  },
  {
    id: 2,
    name: 'The Wall',
    ballStart: { x: 100, y: 430 },
    obstacles: [
      { type: 'rect', x: 370, y: 150, width: 20, height: 320 },
    ],
    stars: [
      { x: 220, y: 360 },
      { x: 530, y: 200 },
      { x: 670, y: 380 },
    ],
    goal: { x: 620, y: 150, width: 100, height: 100 },
    maxBounces: 15,
  },
  {
    id: 3,
    name: 'Obstacle Course',
    ballStart: { x: 100, y: 480 },
    obstacles: [
      { type: 'rect', x: 220, y: 340, width: 130, height: 20 },
      { type: 'rect', x: 450, y: 230, width: 130, height: 20 },
      { type: 'circle', x: 620, y: 390, radius: 35 },
    ],
    stars: [
      { x: 290, y: 300 },
      { x: 520, y: 190 },
      { x: 690, y: 200 },
    ],
    goal: { x: 650, y: 420, width: 100, height: 100 },
    maxBounces: 15,
  },
  {
    id: 4,
    name: 'The Maze',
    ballStart: { x: 80, y: 280 },
    obstacles: [
      { type: 'rect', x: 200, y: 100, width: 20, height: 220 },
      { type: 'rect', x: 360, y: 200, width: 20, height: 260 },
      { type: 'rect', x: 520, y: 80, width: 20, height: 220 },
      { type: 'circle', x: 620, y: 380, radius: 40 },
    ],
    stars: [
      { x: 280, y: 420 },
      { x: 440, y: 140 },
      { x: 680, y: 140 },
    ],
    goal: { x: 670, y: 400, width: 90, height: 90 },
    maxBounces: 12,
  },
  {
    id: 5,
    name: 'Chaos Mode',
    ballStart: { x: 80, y: 480 },
    obstacles: [
      { type: 'rect', x: 180, y: 290, width: 160, height: 20 },
      { type: 'rect', x: 390, y: 170, width: 160, height: 20 },
      { type: 'circle', x: 270, y: 170, radius: 40 },
      { type: 'circle', x: 560, y: 370, radius: 40 },
      { type: 'rect', x: 510, y: 60, width: 20, height: 200 },
    ],
    stars: [
      { x: 340, y: 450 },
      { x: 460, y: 270 },
      { x: 690, y: 120 },
    ],
    goal: { x: 650, y: 400, width: 90, height: 90 },
    maxBounces: 10,
  },
]
