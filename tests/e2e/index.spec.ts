import { test, expect } from '@playwright/test'
import { loginViaForm } from './helpers/login'
import { mockCommitsPayload, emptyCommitsPayload } from './fixtures/commits'

const TARGET_MONTH = '2025-06'

const mockCommitsApi = async (page: import('@playwright/test').Page, payload: unknown) => {
  await page.route('**/api/commits**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload)
    })
  })
}

test.beforeEach(async ({ page }) => {
  await loginViaForm(page)
})

test('shows empty state before loading commits', async ({ page }) => {
  await mockCommitsApi(page, mockCommitsPayload)
  await expect(page).toHaveURL('/')
  await expect(page.getByText('Pick a month and load commits.')).toBeVisible()
})

test('loads commits and renders ranked contributors', async ({ page }) => {
  await mockCommitsApi(page, mockCommitsPayload)

  await page.locator('input[type="month"]').fill(TARGET_MONTH)
  await page.getByRole('button', { name: /load commits/i }).click()

  await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bob Smith' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Carol Davis' })).toBeVisible()

  await expect(page.locator('text="Top Contributor"')).toBeVisible()

  const aliceCard = page.locator('article', { has: page.getByRole('heading', { name: 'Alice Johnson' }) })
  await expect(aliceCard.getByText('#1', { exact: false })).toBeVisible()
})

test('stats panel reflects loaded payload', async ({ page }) => {
  await mockCommitsApi(page, mockCommitsPayload)

  await page.locator('input[type="month"]').fill(TARGET_MONTH)
  await page.getByRole('button', { name: /load commits/i }).click()

  await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible()

  const contributorsBlock = page.locator('div', { has: page.getByText('Contributors', { exact: true }) }).first()
  await expect(contributorsBlock).toContainText('3')

  const commitsBlock = page.locator('div', { has: page.getByText('Commits', { exact: true }) }).first()
  await expect(commitsBlock).toContainText('7')

  const projectsBlock = page.locator('div', { has: page.getByText('Repositories', { exact: true }) }).first()
  await expect(projectsBlock).toContainText('4')
})

test('search filter narrows visible contributors', async ({ page }) => {
  await mockCommitsApi(page, mockCommitsPayload)

  await page.locator('input[type="month"]').fill(TARGET_MONTH)
  await page.getByRole('button', { name: /load commits/i }).click()
  await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible()

  await page.getByPlaceholder('Search author name').fill('bob')

  await expect(page.getByRole('heading', { name: 'Bob Smith' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Carol Davis' })).toHaveCount(0)
})

test('clicking a contributor expands their commit list', async ({ page }) => {
  await mockCommitsApi(page, mockCommitsPayload)

  await page.locator('input[type="month"]').fill(TARGET_MONTH)
  await page.getByRole('button', { name: /load commits/i }).click()

  const aliceCard = page.locator('article', { has: page.getByRole('heading', { name: 'Alice Johnson' }) })
  await aliceCard.getByRole('heading', { name: 'Alice Johnson' }).click()

  await expect(aliceCard.getByText('Add new feature X')).toBeVisible()
  await expect(aliceCard.getByText('Fix bug in payment flow')).toBeVisible()
})

test('shows no-commits state when API returns empty payload', async ({ page }) => {
  await mockCommitsApi(page, emptyCommitsPayload)

  await page.locator('input[type="month"]').fill(TARGET_MONTH)
  await page.getByRole('button', { name: /load commits/i }).click()

  await expect(page.getByText(/no commits found/i)).toBeVisible()
})

test('second load with same month uses localStorage cache', async ({ page }) => {
  let apiCalls = 0
  await page.route('**/api/commits**', async (route) => {
    apiCalls++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockCommitsPayload)
    })
  })

  await page.locator('input[type="month"]').fill(TARGET_MONTH)
  await page.getByRole('button', { name: /load commits/i }).click()
  await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible()
  expect(apiCalls).toBe(1)

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: /load commits/i })).toBeEnabled()

  await page.locator('input[type="month"]').fill(TARGET_MONTH)
  await page.getByRole('button', { name: /load commits/i }).click()
  await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible()
  await expect(page.getByText(/showing cached results/i)).toBeVisible()
  expect(apiCalls).toBe(1)
})
