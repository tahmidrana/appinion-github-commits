import { expect, type Page } from '@playwright/test'

export const loginViaForm = async (page: Page) => {
  const pin = process.env.AUTH_PIN
  if (!pin) {
    throw new Error('AUTH_PIN env var is not set — required to log in via the PIN form')
  }

  await page.goto('/login', { waitUntil: 'networkidle' })

  const pinInput = page.getByPlaceholder('PIN')
  await pinInput.waitFor({ state: 'visible' })

  await pinInput.evaluate((el, value) => {
    const input = el as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, pin)

  const continueButton = page.getByRole('button', { name: /continue/i })
  await expect(continueButton).toBeEnabled({ timeout: 5_000 })
  await continueButton.click()

  await expect(page).toHaveURL('/', { timeout: 10_000 })
}
