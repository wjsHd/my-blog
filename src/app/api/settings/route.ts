import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    // Return defaults if not found
    return NextResponse.json({
      id: 1,
      blog_name: 'Peter · 随笔',
      author_name: 'Peter',
      bio: '记录思考与生活',
      about_content: '',
      avatar: '✍️',
    })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { blog_name, author_name, bio, about_content, avatar } = body

    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .upsert({ id: 1, blog_name, author_name, bio, about_content, avatar })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
