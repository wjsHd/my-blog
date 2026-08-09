import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'
import { revalidateSettingsSurfaces } from '@/lib/revalidatePublicContent'

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
    const normalized = {
      blog_name: typeof blog_name === 'string' ? blog_name.trim() : '',
      author_name: typeof author_name === 'string' ? author_name.trim() : '',
      bio: typeof bio === 'string' ? bio.trim() : '',
      about_content: typeof about_content === 'string' ? about_content : '',
      avatar: typeof avatar === 'string' ? avatar.trim() : '',
    }

    if (!normalized.blog_name || !normalized.author_name) {
      return NextResponse.json({ error: '博客名称和作者名称不能为空' }, { status: 400 })
    }
    if (
      normalized.blog_name.length > 80 ||
      normalized.author_name.length > 80 ||
      normalized.bio.length > 300 ||
      normalized.about_content.length > 100_000 ||
      normalized.avatar.length > 20
    ) {
      return NextResponse.json({ error: '设置内容超过允许长度' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .upsert(
        {
          id: 1,
          ...normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Settings save error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidateSettingsSurfaces()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Settings request error:', err)
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }
}
