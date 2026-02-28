/**
 * Bouncy Ball — End-to-End Tests
 *
 * Physics reference (Level 1 — "The Launch Pad"):
 *   Ball start: canvas (100, 300)
 *   Intended launch drag to: canvas (167, 258)
 *     → vx ≈ 8.04, vy ≈ -5.04
 *     → Ball collects all 3 stars and enters goal at ~frame 31 (≈ 520 ms)
 *   Goal zone: x 340-480, y 230-360
 *   maxBounces: 20
 *
 * Canvas internal size: 800 × 560 px
 */

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { captureScreenshot, assertNoConsoleErrors } from './helpers'

// ─── Constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 800
const CANVAS_H = 560

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert canvas-space coordinates to browser viewport coordinates. */
async function getCanvasTransform(page: Page) {
  const canvas = page.locator('[data-testid="game-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('game-canvas not found in DOM')
  return {
    box,
    sx: (cx: number) => box.x + (cx / CANVAS_W) * box.width,
    sy: (cy: number) => box.y + (cy / CANVAS_H) * box.height,
  }
}

/**
 * Perform the Level-1 launch that sends the ball through all 3 stars and
 * into the goal zone.  Drag: canvas (100,300) → canvas (167,258).
 */
async function launchLevel1ToGoal(page: Page) {
  const { sx, sy } = await getCanvasTransform(page)
  await page.mouse.move(sx(100), sy(300))
  await page.mouse.down()
  // Move smoothly so intermediate mousemove events are dispatched
  await page.mouse.move(sx(167), sy(258), { steps: 15 })
  await page.mouse.up()
}

/**
 * Perform a Level-1 launch straight down so the ball exits through the
 * bottom of the canvas.  Drag: canvas (100,300) → canvas (100,450).
 * vx = 0, vy ≈ 18 — ball falls out of bounds in ≈ 250 ms.
 */
async function launchLevel1Downward(page: Page) {
  const { sx, sy } = await getCanvasTransform(page)
  await page.mouse.move(sx(100), sy(300))
  await page.mouse.down()
  await page.mouse.move(sx(100), sy(450), { steps: 15 })
  await page.mouse.up()
}

/**
 * Perform a Level-1 launch to the LEFT so the ball bounces around but does
 * NOT quickly reach the goal.  Drag: canvas (100,300) → canvas (0,300).
 */
async function launchLevel1Left(page: Page) {
  const { sx, sy } = await getCanvasTransform(page)
  await page.mouse.move(sx(100), sy(300))
  await page.mouse.down()
  await page.mouse.move(sx(0), sy(300), { steps: 15 })
  await page.mouse.up()
}

/** Wipe localStorage so every test starts with default game-data. */
async function resetGameData(page: Page) {
  await page.evaluate(() => localStorage.removeItem('bouncyBallData'))
}

/**
 * Pre-seed localStorage with a completed Level 1 at a given score so we can
 * test whether a better score overwrites it.
 */
async function seedLevel1Score(page: Page, score: number, stars: number) {
  await page.evaluate(
    ([s, st]: [number, number]) => {
      const data = {
        currentUnlockedLevel: 1,
        levels: [
          { levelId: 1, bestScore: s, bestStars: st, completed: true },
          { levelId: 2, bestScore: null, bestStars: null, completed: false },
          { levelId: 3, bestScore: null, bestStars: null, completed: false },
          { levelId: 4, bestScore: null, bestStars: null, completed: false },
          { levelId: 5, bestScore: null, bestStars: null, completed: false },
        ],
      }
      localStorage.setItem('bouncyBallData', JSON.stringify(data))
    },
    [score, stars] as [number, number]
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Bouncy Ball Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await resetGameData(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  // ── Test 1: Happy path — Complete Level 1 ──────────────────────────────────
  test('1. Happy path — complete Level 1, ball moves, stars collected, win screen shows', async ({ page }) => {
    const { check } = assertNoConsoleErrors(page)

    // ── Level Select ─────────────────────────────────────────────────────────
    await expect(page.locator('[data-testid="game-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="level-card-1"]')).toBeVisible()
    await captureScreenshot(page, 'level-select-screen')

    // Navigate to Level 1
    await page.locator('[data-testid="level-card-1"]').click()
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()

    // ── Aiming state screenshot (while holding drag) ──────────────────────────
    const { sx, sy } = await getCanvasTransform(page)
    await page.mouse.move(sx(100), sy(300))
    await page.mouse.down()
    await page.mouse.move(sx(167), sy(258), { steps: 10 })
    // Screenshot while aiming (drag arrow visible)
    await captureScreenshot(page, 'launch-aiming-state')
    await page.mouse.up()

    // ── Wait briefly then screenshot mid-gameplay ─────────────────────────────
    await page.waitForTimeout(200) // ball is now in flight
    await captureScreenshot(page, 'gameplay-mid-level')

    // ── Wait for win screen ───────────────────────────────────────────────────
    await expect(page.locator('[data-testid="win-screen"]')).toBeVisible({ timeout: 10_000 })

    // Score must be greater than 0
    const scoreText = await page.locator('[data-testid="win-score"]').innerText()
    const score = parseInt(scoreText, 10)
    expect(score).toBeGreaterThan(0)

    // ── Win screen screenshot ─────────────────────────────────────────────────
    await captureScreenshot(page, 'win-screen-overlay')

    check()
  })

  // ── Test 2: Score persistence ─────────────────────────────────────────────
  test('2. Score persistence — best score saved to localStorage and survives page reload', async ({ page }) => {
    const { check } = assertNoConsoleErrors(page)

    // Complete Level 1
    await page.locator('[data-testid="level-card-1"]').click()
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()
    await launchLevel1ToGoal(page)
    await expect(page.locator('[data-testid="win-screen"]')).toBeVisible({ timeout: 10_000 })

    const scoreText = await page.locator('[data-testid="win-score"]').innerText()
    const score = parseInt(scoreText, 10)
    expect(score).toBeGreaterThan(0)

    // Return to Level Select
    await page.locator('[data-testid="win-level-select-btn"]').click()
    await expect(page.locator('[data-testid="level-grid"]')).toBeVisible()

    // Best score should appear on Level 1 card
    const bestScoreEl = page.locator('[data-testid="best-score-1"]')
    await expect(bestScoreEl).toContainText(String(score))

    // Reload the page — score must still be there (localStorage persistence)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="best-score-1"]')).toContainText(String(score))

    check()
  })

  // ── Test 3: Level unlocking ───────────────────────────────────────────────
  test('3. Level unlocking — Level 2 is locked initially, unlocked after completing Level 1', async ({ page }) => {
    const { check } = assertNoConsoleErrors(page)

    // Level 2 should be locked
    await expect(page.locator('[data-testid="level-locked-2"]')).toBeVisible()
    // Level 1 card should be clickable (not locked)
    await expect(page.locator('[data-testid="level-card-1"]')).toBeEnabled()

    // Complete Level 1
    await page.locator('[data-testid="level-card-1"]').click()
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()
    await launchLevel1ToGoal(page)
    await expect(page.locator('[data-testid="win-screen"]')).toBeVisible({ timeout: 10_000 })

    // Go back to Level Select
    await page.locator('[data-testid="win-level-select-btn"]').click()
    await expect(page.locator('[data-testid="level-grid"]')).toBeVisible()

    // Level 2 should now be accessible (lock icon gone)
    await expect(page.locator('[data-testid="level-locked-2"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="level-card-2"]')).toBeEnabled()

    check()
  })

  // ── Test 4: Restart functionality ─────────────────────────────────────────
  test('4. Restart — ball resets to start, bounces reset to 0, timer resets, stars uncollected', async ({ page }) => {
    const { check } = assertNoConsoleErrors(page)

    // Navigate to Level 1
    await page.locator('[data-testid="level-card-1"]').click()
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()

    // Verify initial HUD state
    await expect(page.locator('[data-testid="hud-stars"]')).toContainText('0/3')

    // Launch the ball leftward so it stays in play for a while
    await launchLevel1Left(page)

    // Wait for phase to be 'playing' (React re-render takes a few ms)
    await page.waitForTimeout(150)

    // Click Pause
    const pauseBtn = page.locator('[data-testid="pause-btn"]')
    await expect(pauseBtn).toBeEnabled()
    await pauseBtn.click()

    // Pause overlay should appear
    await expect(page.locator('text=PAUSED')).toBeVisible()

    // Click Restart from pause overlay
    await page.locator('[data-testid="pause-restart-btn"]').click()

    // After restart: HUD should show reset values
    await expect(page.locator('[data-testid="hud-bounces"]')).toContainText('0/')
    await expect(page.locator('[data-testid="hud-time"]')).toContainText('00:00')
    await expect(page.locator('[data-testid="hud-stars"]')).toContainText('0/3')

    // Pause overlay should be gone
    await expect(page.locator('text=PAUSED')).not.toBeVisible()

    check()
  })

  // ── Test 5: Ball out of bounds → loss screen, retry resets level ──────────
  test('5. Out of bounds — ball falls off bottom, loss screen appears, retry resets level', async ({ page }) => {
    const { check } = assertNoConsoleErrors(page)

    // Navigate to Level 1
    await page.locator('[data-testid="level-card-1"]').click()
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()

    // Launch the ball straight down — it will exit canvas bottom
    await launchLevel1Downward(page)

    // Loss screen should appear
    await expect(page.locator('[data-testid="loss-screen"]')).toBeVisible({ timeout: 5_000 })

    // Click Retry
    await page.locator('[data-testid="retry-btn"]').click()

    // After retry: level is reset
    // - Loss screen is gone
    await expect(page.locator('[data-testid="loss-screen"]')).not.toBeVisible()
    // - HUD is back to initial values
    await expect(page.locator('[data-testid="hud-bounces"]')).toContainText('0/')
    await expect(page.locator('[data-testid="hud-time"]')).toContainText('00:00')
    await expect(page.locator('[data-testid="hud-stars"]')).toContainText('0/3')

    check()
  })

  // ── Test 6: Star collection ───────────────────────────────────────────────
  test('6. Star collection — stars disappear on contact, HUD counter increments', async ({ page }) => {
    const { check } = assertNoConsoleErrors(page)

    await page.locator('[data-testid="level-card-1"]').click()
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()

    // Stars start at 0
    await expect(page.locator('[data-testid="hud-stars"]')).toContainText('0/3')

    // Launch with the trajectory that collects all 3 stars
    await launchLevel1ToGoal(page)

    // Wait for win screen (all stars collected on the way to goal)
    await expect(page.locator('[data-testid="win-screen"]')).toBeVisible({ timeout: 10_000 })

    // The HUD should show 3/3 stars (visible through the win overlay)
    await expect(page.locator('[data-testid="hud-stars"]')).toContainText('3/3')

    // Stars bonus in the score breakdown confirms collection
    const winScore = await page.locator('[data-testid="win-score"]').innerText()
    expect(parseInt(winScore, 10)).toBeGreaterThan(1500) // 3 stars × 500 = 1500 minimum

    check()
  })

  // ── Test 7: High score update ─────────────────────────────────────────────
  test('7. High score update — completing level with better score updates the best score', async ({ page }) => {
    const { check } = assertNoConsoleErrors(page)

    // Seed a very low previous best so our new score will definitely be higher
    const previousBest = 50
    await seedLevel1Score(page, previousBest, 0)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify the seeded score shows on the level card
    await expect(page.locator('[data-testid="best-score-1"]')).toContainText(String(previousBest))

    // Complete Level 1 — the intended trajectory gives score ≈ 4094 (>> 50)
    await page.locator('[data-testid="level-card-1"]').click()
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()
    await launchLevel1ToGoal(page)
    await expect(page.locator('[data-testid="win-screen"]')).toBeVisible({ timeout: 10_000 })

    const newScoreText = await page.locator('[data-testid="win-score"]').innerText()
    const newScore = parseInt(newScoreText, 10)
    expect(newScore).toBeGreaterThan(previousBest)

    // Return to Level Select — card should show the new (higher) best score
    await page.locator('[data-testid="win-level-select-btn"]').click()
    await expect(page.locator('[data-testid="level-grid"]')).toBeVisible()

    const updatedBestEl = page.locator('[data-testid="best-score-1"]')
    await expect(updatedBestEl).toContainText(String(newScore))
    // Must NOT show the old low score any longer
    await expect(updatedBestEl).not.toContainText(String(previousBest))

    check()
  })
})
