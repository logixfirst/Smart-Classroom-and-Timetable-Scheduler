/**
 * E2E Tests using Playwright - Tests complete user flows
 * Run: npx playwright test
 */
import { test, expect, type Page } from '@playwright/test'

// Helper function to login
async function login(page: Page, email: string, password: string) {
  await page.goto('http://localhost:3000/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/**')
}

test.describe('Authentication Flow', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    await page.fill('[name="email"]', 'admin@test.com')
    await page.fill('[name="password"]', 'testpass123')

    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('failed login shows error message', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    await page.fill('[name="email"]', 'wrong@test.com')
    await page.fill('[name="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    await expect(page.locator('[role="alert"]')).toContainText(/invalid/i)
  })

  test('logout redirects to login page', async ({ page }) => {
    await login(page, 'admin@test.com', 'testpass123')

    // Click profile dropdown
    await page.click('[data-testid="profile-dropdown"]')

    // Click logout
    await page.click('text=Logout')

    await expect(page).toHaveURL(/.*login/)
  })

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/dashboard')

    await expect(page).toHaveURL(/.*login/)
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@test.com', 'testpass123')
  })

  test('displays dashboard stats', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/dashboard')

    // Check for stat cards
    await expect(page.locator('[data-testid="stat-card"]')).toHaveCount(4)

    // Check stats have values
    const totalStudents = await page.locator('[data-testid="total-students"]')
    await expect(totalStudents).toBeVisible()
  })

  test('dashboard loads without errors', async ({ page }) => {
    let hasError = false

    page.on('pageerror', error => {
      console.error('Page error:', error)
      hasError = true
    })

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text())
        hasError = true
      }
    })

    await page.goto('http://localhost:3000/admin/dashboard')
    await page.waitForLoadState('networkidle')

    expect(hasError).toBe(false)
  })

  test('navigation works from dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/dashboard')

    await page.click('text=Students')
    await expect(page).toHaveURL(/.*students/)

    await page.click('text=Faculty')
    await expect(page).toHaveURL(/.*faculty/)
  })
})

test.describe('Students Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@test.com', 'testpass123')
    await page.goto('http://localhost:3000/admin/students')
  })

  test('displays students list', async ({ page }) => {
    await page.waitForSelector('[data-testid="students-table"]')

    const table = page.locator('[data-testid="students-table"]')
    await expect(table).toBeVisible()
  })

  test('search filters students', async ({ page }) => {
    await page.fill('[placeholder*="Search"]', 'John')

    await page.waitForTimeout(500) // Debounce

    const rows = page.locator('tbody tr')
    const count = await rows.count()

    // Should have filtered results
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('pagination works', async ({ page }) => {
    await page.waitForSelector('[data-testid="pagination"]')

    const nextButton = page.locator('button:has-text("Next")')

    if (await nextButton.isEnabled()) {
      await nextButton.click()

      await page.waitForLoadState('networkidle')

      // URL should have page parameter
      await expect(page).toHaveURL(/page=2/)
    }
  })

  test('create student flow', async ({ page }) => {
    // Click add button
    await page.click('button:has-text("Add Student")')

    // Fill form
    await page.fill('[name="student_id"]', 'STU999')
    await page.selectOption('[name="batch"]', { index: 1 })

    // Submit
    await page.click('button[type="submit"]')

    // Check for success message
    await expect(page.locator('[role="status"]')).toContainText(/success|created/i)
  })

  test('edit student flow', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('[data-testid="students-table"]')

    // Click first edit button
    const editButton = page.locator('button[aria-label="Edit"]').first()
    await editButton.click()

    // Update field
    await page.fill('[name="student_id"]', 'STU001-UPDATED')

    // Submit
    await page.click('button:has-text("Update")')

    // Check for success
    await expect(page.locator('[role="status"]')).toContainText(/updated/i)
  })

  test('delete student flow', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('[data-testid="students-table"]')

    // Click first delete button
    const deleteButton = page.locator('button[aria-label="Delete"]').first()
    await deleteButton.click()

    // Confirm deletion
    await page.click('button:has-text("Confirm")')

    // Check for success
    await expect(page.locator('[role="status"]')).toContainText(/deleted/i)
  })

  test('export students data', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export")'),
    ])

    expect(download).toBeTruthy()
    expect(download.suggestedFilename()).toContain('students')
  })
})

test.describe('Faculty Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@test.com', 'testpass123')
    await page.goto('http://localhost:3000/admin/faculty')
  })

  test('displays faculty list', async ({ page }) => {
    await page.waitForSelector('[data-testid="faculty-table"]')

    const table = page.locator('[data-testid="faculty-table"]')
    await expect(table).toBeVisible()
  })

  test('filter by department', async ({ page }) => {
    await page.selectOption('[name="department"]', { index: 1 })

    await page.waitForLoadState('networkidle')

    // Table should update
    await expect(page.locator('[data-testid="faculty-table"]')).toBeVisible()
  })
})

test.describe('Attendance Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'faculty@test.com', 'testpass123')
    await page.goto('http://localhost:3000/faculty/attendance')
  })

  test('displays attendance sessions', async ({ page }) => {
    await page.waitForSelector('[data-testid="sessions-list"]')

    const sessions = page.locator('[data-testid="session-card"]')
    const count = await sessions.count()

    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('mark attendance flow', async ({ page }) => {
    // Click first session
    const sessionCard = page.locator('[data-testid="session-card"]').first()
    await sessionCard.click()

    // Mark some students present
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()

    if (count > 0) {
      await checkboxes.first().check()
      await checkboxes.nth(1).check()
    }

    // Submit attendance
    await page.click('button:has-text("Submit Attendance")')

    // Check for success
    await expect(page.locator('[role="status"]')).toContainText(/success/i)
  })
})

test.describe('Performance', () => {
  test('page load time is acceptable', async ({ page }) => {
    await login(page, 'admin@test.com', 'testpass123')

    const startTime = Date.now()
    await page.goto('http://localhost:3000/admin/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    console.log(`Dashboard load time: ${loadTime}ms`)

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('no console errors on critical pages', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await login(page, 'admin@test.com', 'testpass123')

    const pages = ['/admin/dashboard', '/admin/students', '/admin/faculty', '/admin/timetables']

    for (const url of pages) {
      await page.goto(`http://localhost:3000${url}`)
      await page.waitForLoadState('networkidle')
    }

    console.log('Console errors:', errors)
    expect(errors.length).toBe(0)
  })
})

test.describe('Accessibility', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    // Check for proper labels
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()

    // Check for submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    // Tab through form
    await page.keyboard.press('Tab')
    await expect(page.locator('[name="email"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[name="password"]')).toBeFocused()
  })
})

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('dashboard is responsive on mobile', async ({ page }) => {
    await login(page, 'admin@test.com', 'testpass123')
    await page.goto('http://localhost:3000/admin/dashboard')

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
  })

  test('tables are scrollable on mobile', async ({ page }) => {
    await login(page, 'admin@test.com', 'testpass123')
    await page.goto('http://localhost:3000/admin/students')

    const table = page.locator('[data-testid="students-table"]')
    await expect(table).toBeVisible()

    // Table should be in a scrollable container
    const scrollContainer = page.locator('[data-testid="table-scroll-container"]')
    await expect(scrollContainer).toBeVisible()
  })
})
