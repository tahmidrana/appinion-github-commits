import { test, expect } from '@playwright/test'
import { loginViaForm } from './helpers/login'
import { mockBackupsPayload, gapBackupsPayload, errorBackupsPayload, emptyBackupsPayload, pruneDangerPayload } from './fixtures/backups'

const mockBackupsApi = async (page: import('@playwright/test').Page, payload: unknown) => {
  await page.route('**/api/backups**', async (route) => {
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

test('renders project cards across sources with backup stats', async ({ page }) => {
  await mockBackupsApi(page, mockBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  await expect(page.getByRole('heading', { name: 'Backups', exact: true })).toBeVisible()
  await expect(page.getByTestId('group-heading-appinion')).toHaveText('Appinion')
  await expect(page.getByTestId('group-heading-renata')).toHaveText('Renata')
  await expect(page.getByRole('heading', { name: 'Agrani Amar Passbook' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Healthy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'NPHL-Backups' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Momenta · backup-db' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Momenta · backup-source-and-files' })).toBeVisible()

  const projectsBlock = page.locator('div', { has: page.getByText('Projects', { exact: true }) }).first()
  await expect(projectsBlock).toContainText('5')

  const backupsBlock = page.locator('div', { has: page.getByText('Backup files', { exact: true }) }).first()
  await expect(backupsBlock).toContainText('6')
})

test('expands a project to show backup timestamps', async ({ page }) => {
  await mockBackupsApi(page, mockBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  const projectCard = page.locator('article', { has: page.getByRole('heading', { name: 'Agrani Amar Passbook' }) })
  await projectCard.getByRole('button').click()

  await expect(projectCard.getByText('2026-08-05-02-00-01.zip')).toBeVisible()
  await expect(projectCard.getByText('2026-08-06-02-00-02.zip')).toBeVisible()
  await expect(projectCard.locator('time[datetime="2026-08-05T02:00:01Z"]')).toBeVisible()
})

test('search narrows visible projects', async ({ page }) => {
  await mockBackupsApi(page, mockBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  await page.getByPlaceholder('Filter by project name').fill('healthy')

  await expect(page.getByRole('heading', { name: 'Healthy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Agrani Amar Passbook' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'NPHL-Backups' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Momenta · backup-db' })).toHaveCount(0)
})

test('account filter narrows to renata sources', async ({ page }) => {
  await mockBackupsApi(page, mockBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  await page.locator('select').selectOption('renata')

  await expect(page.getByRole('heading', { name: 'Momenta · backup-db' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Momenta · backup-source-and-files' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Agrani Amar Passbook' })).toHaveCount(0)
})

test('shows an error banner for a source the account cannot access', async ({ page }) => {
  await mockBackupsApi(page, errorBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  await expect(page.getByText('Re-Develop Learning Portal')).toBeVisible()
  await expect(page.getByText(/Access Denied/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Agrani Amar Passbook' })).toBeVisible()
})

test('shows empty state when no sources are configured', async ({ page }) => {
  await mockBackupsApi(page, emptyBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  await expect(page.getByRole('heading', { name: 'Backups', exact: true })).toBeVisible()
  await expect(page.getByText('No backups found.')).toBeVisible()

  const projectsBlock = page.locator('div', { has: page.getByText('Projects', { exact: true }) }).first()
  await expect(projectsBlock).toContainText('0')
})

test('flags today as missing with a red row when no backup exists today', async ({ page }) => {
  await mockBackupsApi(page, mockBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  const projectCard = page.locator('article', { has: page.getByRole('heading', { name: 'Agrani Amar Passbook' }) })
  await projectCard.getByRole('button').click()

  const missingRow = projectCard.locator('li', { hasText: 'Missing today' })
  await expect(missingRow).toBeVisible()
  await expect(missingRow).toContainText('6 days without a backup')
  await expect(missingRow).toHaveClass(/bg-rose-100/)

  const badge = projectCard.getByText('Missing today').first()
  await expect(badge).toBeVisible()
})

test('flags a date gap with a red row while today is present', async ({ page }) => {
  await mockBackupsApi(page, gapBackupsPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  const projectCard = page.locator('article', { has: page.getByRole('heading', { name: 'Agrani Amar Passbook' }) })
  await projectCard.getByRole('button').click()

  const missingRow = projectCard.locator('li', { hasText: 'Missing', exact: false })
  await expect(missingRow).toBeVisible()
  await expect(missingRow).toContainText('Aug 6, 2026')
  await expect(missingRow).toContainText('1 day without a backup')
  await expect(missingRow).toHaveClass(/bg-rose-50/)

  await expect(projectCard.getByText('1 missing day')).toBeVisible()
})

test('suggests pruning when a project has more than 10 backups', async ({ page }) => {
  await mockBackupsApi(page, pruneDangerPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  const dbCard = page.locator('article', { has: page.getByRole('heading', { name: 'Momenta · backup-db' }) })
  await expect(dbCard.getByText('Prune old backups')).toBeVisible()
})

test('marks danger when a project has no backup in the last 10 days', async ({ page }) => {
  await mockBackupsApi(page, pruneDangerPayload)

  await page.goto('/backups', { waitUntil: 'networkidle' })

  const filesCard = page.locator('article', { has: page.getByRole('heading', { name: 'Momenta · backup-source-and-files' }) })
  await expect(filesCard.getByText('No backup in 11 days')).toBeVisible()
})
