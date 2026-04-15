import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin, supabase } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'
import { generateSlug, getExcerpt, calcReadingTime } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '8')
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
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(from, to)

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
    const { title, content, excerpt, cover_image, category, tags, status } = body

    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    }

    const slug = generateSlug(title)
    const reading_time = calcReadingTime(content || '')
    const finalExcerpt = excerpt || getExcerpt(content || '', 120)

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        title,
        slug,
        content: content || '',
        excerpt: finalExcerpt,
        cover_image: cover_image || null,
        category: category || '文章',
        tags: tags || [],
        status: status || 'draft',
        reading_time,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/posts/[slug]', 'page')
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
