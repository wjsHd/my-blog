import { expect, test } from '@playwright/test'
import { hasMeaningfulPostContent } from '../../src/lib/postContent'

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
})
