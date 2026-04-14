import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Post } from '@/types'
import { PostEditor } from '@/components/admin/PostEditor'

async function getPost(id: string): Promise<Post | null> {
  const { data } = await supabaseAdmin.from('posts').select('*').eq('id', id).single()
  return data || null
}

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)
  if (!post) notFound()

  return <PostEditor initialData={post} />
}
