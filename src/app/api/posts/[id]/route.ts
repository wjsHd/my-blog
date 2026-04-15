import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'
import { getExcerpt, calcReadingTime } from '@/lib/utils'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, content, excerpt, cover_image, category, tags, status } = body

    const reading_time = calcReadingTime(content || '')
    const finalExcerpt = excerpt || getExcerpt(content || '', 120)

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        title,
        content: content || '',
        excerpt: finalExcerpt,
        cover_image: cover_image || null,
        category: category || '文章',
        tags: tags || [],
        status: status || 'draft',
        reading_time,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/posts/[slug]', 'page')
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { error } = await supabaseAdmin.from('posts').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/')
  revalidatePath('/posts/[slug]', 'page')
  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}))

  // Increment views (public, no auth needed)
  if (body.action === 'increment_views') {
    try {
      // Fallback: manual increment
      const { data } = await supabaseAdmin
        .from('posts')
        .select('views')
        .eq('id', params.id)
        .single()
      if (data) {
        await supabaseAdmin
          .from('posts')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', params.id)
      }
    } catch {
      // ignore view count errors
    }
    return NextResponse.json({ success: true })
  }

  // Toggle status (admin only)
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  if (body.status) {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({ status: body.status })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: '无效操作' }, { status: 400 })
}
