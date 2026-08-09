import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, enforcePinLimit } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'
import { getExcerpt, calcReadingTime } from '@/lib/utils'
import { normalizePostInput } from '@/lib/postInput'
import { revalidatePostSurfaces } from '@/lib/revalidatePublicContent'
import { hasInvestmentTemplatePlaceholders } from '@/lib/investmentTemplate'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const normalized = normalizePostInput(body)
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }
    const { title, content, excerpt, cover_image, category, tags, status, pinned } = normalized.data

    if (status === 'published' && hasInvestmentTemplatePlaceholders(content)) {
      return NextResponse.json({ error: '正文仍包含投资理财模板提示语，请填写完成后再发布' }, { status: 400 })
    }

    if (status === 'published') {
      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from('posts')
        .select('id')
        .eq('title', title)
        .eq('status', 'published')
        .neq('id', id)
        .limit(1)
        .maybeSingle()

      if (duplicateError) {
        return NextResponse.json({ error: duplicateError.message }, { status: 500 })
      }
      if (duplicate) {
        return NextResponse.json(
          { error: '已存在同名已发布文章，请编辑原文章或修改标题' },
          { status: 409 }
        )
      }
    }

    const reading_time = calcReadingTime(content)
    const finalExcerpt = excerpt || getExcerpt(content, 120)

    // 取出旧的 pinned 状态，判断是否要刷新 pinned_at
    const { data: existing } = await supabaseAdmin
      .from('posts')
      .select('pinned, pinned_at')
      .eq('id', id)
      .single()

    let pinnedAt: string | null = existing?.pinned_at ?? null
    if (pinned && !existing?.pinned) {
      // 从未置顶 → 置顶：刷新时间戳
      pinnedAt = new Date().toISOString()
    } else if (!pinned) {
      // 取消置顶：清空时间戳
      pinnedAt = null
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        title,
        content,
        excerpt: finalExcerpt,
        cover_image,
        category,
        tags,
        status,
        pinned,
        pinned_at: pinnedAt,
        reading_time,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 仅在置顶时校验上限
    if (pinned) {
      await enforcePinLimit(id)
    }

    revalidatePostSurfaces(data.slug)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await params
  const { error } = await supabaseAdmin.from('posts').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePostSurfaces()
  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  if (body.status === 'draft' || body.status === 'published') {
    if (body.status === 'published') {
      const { data: current, error: currentError } = await supabaseAdmin
        .from('posts')
        .select('title, content')
        .eq('id', id)
        .single()

      if (currentError || !current) {
        return NextResponse.json({ error: '文章不存在' }, { status: 404 })
      }

      if (hasInvestmentTemplatePlaceholders(current.content || '')) {
        return NextResponse.json({ error: '正文仍包含投资理财模板提示语，请填写完成后再发布' }, { status: 400 })
      }

      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from('posts')
        .select('id')
        .eq('title', current.title)
        .eq('status', 'published')
        .neq('id', id)
        .limit(1)
        .maybeSingle()

      if (duplicateError) {
        return NextResponse.json({ error: duplicateError.message }, { status: 500 })
      }
      if (duplicate) {
        return NextResponse.json(
          { error: '已存在同名已发布文章，请编辑原文章或修改标题' },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePostSurfaces(data.slug)
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: '无效操作' }, { status: 400 })
}
