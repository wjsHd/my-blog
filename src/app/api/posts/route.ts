import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin, supabase, enforcePinLimit } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'
import { generateSlug, getExcerpt, calcReadingTime } from '@/lib/utils'
import { normalizePostInput } from '@/lib/postInput'

function parsePositiveInteger(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, maximum)
}

function sanitizeSearchTerm(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parsePositiveInteger(searchParams.get('page'), 1, 10_000)
  const limit = parsePositiveInteger(searchParams.get('limit'), 8, 50)
  const status = searchParams.get('status') || null
  const category = searchParams.get('category') || null
  const search = searchParams.get('search') || null
  const isAdmin = await isAdminRequest(request)

  const from = (page - 1) * limit
  const to = from + limit - 1

  const client = isAdmin ? supabaseAdmin : supabase

  let query = client.from('posts').select('*', { count: 'exact' })

  if (!isAdmin) {
    query = query.eq('status', 'published')
  } else if (status) {
    query = query.eq('status', status)
  }

  if (category && category !== '全部') {
    query = query.eq('category', category)
  }

  if (search) {
    const safeSearch = sanitizeSearchTerm(search)
    if (safeSearch) {
      query = query.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%`)
    }
  }

  query = query
    .order('pinned', { ascending: false })
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    posts: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const normalized = normalizePostInput(body)
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }
    const { title, content, excerpt, cover_image, category, tags, status, pinned } = normalized.data

    if (status === 'published') {
      const { data: duplicate, error: duplicateError } = await supabaseAdmin
        .from('posts')
        .select('id')
        .eq('title', title)
        .eq('status', 'published')
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

    const slug = generateSlug(title)
    const reading_time = calcReadingTime(content)
    const finalExcerpt = excerpt || getExcerpt(content, 120)

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        title,
        slug,
        content,
        excerpt: finalExcerpt,
        cover_image,
        category,
        tags,
        status,
        pinned,
        pinned_at: pinned ? new Date().toISOString() : null,
        reading_time,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 如果新建时直接置顶，需要校验置顶上限
    if (pinned && data) {
      await enforcePinLimit(data.id)
    }

    revalidatePath('/')
    revalidatePath('/posts/[slug]', 'page')
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
