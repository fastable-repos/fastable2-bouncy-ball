import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Capture a screenshot to the e2e/screenshots directory.
 */
export async function captureScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: false })
}

/**
 * Set up a console-error monitor. Call this at the start of a test.
 * Returns a `check()` function — call it at the end of the test to assert
 * no console errors were emitted.
 */
export function assertNoConsoleErrors(page: Page): { check: () => void } {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return {
    check: () => {
      expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toHaveLength(0)
    },
  }
}
