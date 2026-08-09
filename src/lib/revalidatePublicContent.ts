import 'server-only'
import { revalidatePath } from 'next/cache'

export function revalidatePostSurfaces(slug?: string) {
  revalidatePath('/')
  revalidatePath('/archive')
  revalidatePath('/rss.xml')
  revalidatePath('/sitemap.xml')
  revalidatePath('/posts/[slug]', 'page')
  if (slug) revalidatePath(`/posts/${slug}`)
}

export function revalidateSettingsSurfaces() {
  revalidatePath('/')
  revalidatePath('/about')
  revalidatePath('/archive')
  revalidatePath('/rss.xml')
  revalidatePath('/posts/[slug]', 'page')
}
