import type { GameData, LevelProgress, ScoreBreakdown } from './types'
import { LEVELS } from './levels'

const STORAGE_KEY = 'bouncyBallData'

export function getDefaultGameData(): GameData {
  return {
    currentUnlockedLevel: 1,
    levels: LEVELS.map((level) => ({
      levelId: level.id,
      bestScore: null,
      bestStars: null,
      completed: false,
    })),
  }
}

export function loadGameData(): GameData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultGameData()
    const data = JSON.parse(raw) as GameData
    if (!data.levels || data.levels.length < LEVELS.length) {
      return getDefaultGameData()
    }
    return data
  } catch (err) {
    console.error('Failed to load game data:', err)
    return getDefaultGameData()
  }
}

export function saveGameData(data: GameData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save game data:', err)
  }
}

export function updateLevelProgress(
  levelId: number,
  score: number,
  starsCollected: number
): GameData {
  const data = loadGameData()
  const levelIndex = data.levels.findIndex((l) => l.levelId === levelId)

  if (levelIndex === -1) return data

  const existing: LevelProgress = data.levels[levelIndex]
  data.levels[levelIndex] = {
    ...existing,
    completed: true,
    bestScore:
      existing.bestScore === null ? score : Math.max(existing.bestScore, score),
    bestStars:
      existing.bestStars === null
        ? starsCollected
        : Math.max(existing.bestStars, starsCollected),
  }

  if (levelId < LEVELS.length) {
    data.currentUnlockedLevel = Math.max(
      data.currentUnlockedLevel,
      levelId + 1
    )
  }

  saveGameData(data)
  return data
}

export function calculateScore(
  starsCollected: number,
  bounces: number,
  timeSeconds: number,
  maxBounces: number
): ScoreBreakdown {
  const starsBonus = starsCollected * 500
  const bounceEfficiency = Math.max(0, (maxBounces - bounces) * 100)
  const timeBonus = Math.max(0, Math.floor((60 - timeSeconds) * 10))
  const total = starsBonus + bounceEfficiency + timeBonus
  return { starsBonus, bounceEfficiency, timeBonus, total }
}

export function resetGameData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to reset game data:', err)
  }
}
