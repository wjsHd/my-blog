import { expect, test } from '@playwright/test'
import { hasMeaningfulPostContent } from '../../src/lib/postContent'
import { sanitizeRichHtml } from '../../src/lib/sanitizeHtml'

test.describe('文章发布内容校验', () => {
  test('拒绝空白的 TipTap 正文', () => {
    expect(hasMeaningfulPostContent('')).toBeFalsy()
    expect(hasMeaningfulPostContent('<p></p>')).toBeFalsy()
    expect(hasMeaningfulPostContent('<p>&nbsp;</p>')).toBeFalsy()
  })

  test('接受文字、图片或视频内容', () => {
    expect(hasMeaningfulPostContent('<p>今天的实践记录</p>')).toBeTruthy()
    expect(hasMeaningfulPostContent('<p></p><img src="https://example.com/a.webp" alt="记录">')).toBeTruthy()
    expect(hasMeaningfulPostContent('<video src="https://example.com/a.mp4"></video>')).toBeTruthy()
  })

  test('清理危险正文并为外链和图片补充安全属性', () => {
    const sanitized = sanitizeRichHtml(`
      <script>alert('xss')</script>
      <a href="https://example.com" target="_blank">外链</a>
      <img src="https://example.com/a.webp" onerror="alert(1)" alt="记录">
    `)

    expect(sanitized).not.toContain('<script')
    expect(sanitized).not.toContain('onerror')
    expect(sanitized).toContain('rel="noopener noreferrer"')
    expect(sanitized).toContain('loading="lazy"')
    expect(sanitized).toContain('decoding="async"')
  })
})
