export interface Vec2 {
  x: number
  y: number
}

export interface RectObstacle {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export interface CircleObstacle {
  type: 'circle'
  x: number
  y: number
  radius: number
}

export type Obstacle = RectObstacle | CircleObstacle

export interface StarConfig {
  x: number
  y: number
}

export interface GoalZone {
  x: number
  y: number
  width: number
  height: number
}

export interface LevelConfig {
  id: number
  name: string
  ballStart: Vec2
  obstacles: Obstacle[]
  stars: StarConfig[]
  goal: GoalZone
  maxBounces: number
}

export interface LevelProgress {
  levelId: number
  bestScore: number | null
  bestStars: number | null
  completed: boolean
}

export interface GameData {
  currentUnlockedLevel: number
  levels: LevelProgress[]
}

export interface BallState {
  x: number
  y: number
  vx: number
  vy: number
}

export interface ScoreBreakdown {
  starsBonus: number
  bounceEfficiency: number
  timeBonus: number
  total: number
}

export type GamePhase = 'aiming' | 'playing' | 'paused' | 'won' | 'lost'
