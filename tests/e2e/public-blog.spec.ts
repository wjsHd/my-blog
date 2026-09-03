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

    await expect.poll(() => page.locator('.motion-card-enter').evaluateAll((items) =>
      items.filter((item) => getComputedStyle(item).opacity === '1').length
    )).toBe(8)
  })

  test('首页归档侧栏保持紧凑并提供完整归档入口', async ({ page }) => {
    await page.goto('/')

    const visibleMonths = await page.getByTestId('sidebar-archive-month').count()
    expect(visibleMonths).toBeGreaterThan(0)
    expect(visibleMonths).toBeLessThanOrEqual(6)
    await expect(page.getByTestId('sidebar-archive-all')).toBeVisible()
    await expect(page.getByTestId('sidebar-archive-all')).toHaveAttribute('href', '/archive')
  })

  test('完整归档页限制单页文章数量并提供翻页', async ({ page }) => {
    await page.goto('/archive')

    const visiblePosts = await page.getByTestId('archive-post').count()
    expect(visiblePosts).toBeGreaterThan(0)
    expect(visiblePosts).toBeLessThanOrEqual(24)
    await expect(page.getByTestId('archive-pagination')).toBeVisible()
    await expect(page.getByRole('link', { name: '下一页' })).toHaveAttribute('href', '/archive?page=2')
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

  test('内容服务健康检查可用且不会被缓存', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.ok()).toBeTruthy()
    expect(response.headers()['cache-control']).toContain('no-store')
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      database: 'reachable',
      publishedPosts: expect.any(Number),
    })
  })

  test('公开页面带有基础安全响应头', async ({ request }) => {
    const response = await request.get('/')

    expect(response.headers()['x-content-type-options']).toBe('nosniff')
    expect(response.headers()['x-frame-options']).toBe('DENY')
    expect(response.headers()['content-security-policy']).toContain("object-src 'none'")
    expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(response.headers()['content-security-policy']).toContain("connect-src 'self' blob:")
  })

  test('图片裁剪可以读取浏览器本地临时图片', async ({ page }) => {
    await page.goto('/admin/login')

    const cropSource = await page.evaluate(async () => {
      const objectUrl = URL.createObjectURL(new Blob(['crop-source'], { type: 'text/plain' }))
      try {
        return await fetch(objectUrl).then((response) => response.text())
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    })

    expect(cropSource).toBe('crop-source')
  })

  test('关于页面使用正式狗狗头像', async ({ page }) => {
    await page.goto('/about')

    const avatar = page.getByAltText('Peter 的狗狗头像')
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute('src', /dog-avatar\.webp/)
  })
})
