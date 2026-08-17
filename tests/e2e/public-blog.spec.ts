import { expect, test } from '@playwright/test'

test.describe('公开博客', () => {
  test('首页保持 1 篇主文章和 8 篇文章卡片', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('featured-post-card')).toHaveCount(1)
    await expect(page.getByTestId('post-card')).toHaveCount(8)

    const cards = page.getByTestId('post-card')
    for (let index = 0; index < 8; index += 1) {
      await expect(cards.nth(index).locator('.cover-media')).toHaveCount(1)
    }
  })

  test('移动端没有横向溢出并保留主要操作', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await expect(page.getByRole('button', { name: '切换日间或夜间模式' })).toBeVisible()
    await expect(page.getByRole('button', { name: '搜索' })).toBeVisible()
    await expect(page.getByRole('button', { name: '菜单' })).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  })

  test('夜间模式可以切换并保存偏好', async ({ page }) => {
    await page.goto('/')
    const themeButton = page.getByRole('button', { name: '切换日间或夜间模式' })

    await themeButton.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('blog-theme'))).toBe('dark')
  })

  test('搜索可以返回已发布文章', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '搜索' }).click()
    const searchInput = page.getByRole('combobox', { name: '搜索文章' })
    await searchInput.fill('投资理财')

    await expect(page.getByRole('listbox')).toBeVisible()
    await expect(page.getByRole('option').first()).toBeVisible()
  })

  test('RSS 与站点地图可以访问', async ({ request }) => {
    const [rss, sitemap] = await Promise.all([
      request.get('/rss.xml'),
      request.get('/sitemap.xml'),
    ])

    expect(rss.ok()).toBeTruthy()
    expect(await rss.text()).toContain('<rss')
    expect(sitemap.ok()).toBeTruthy()
    expect(await sitemap.text()).toContain('<urlset')
  })
})
