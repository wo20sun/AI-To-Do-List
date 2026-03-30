import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { UpdateTaskBody } from '@/types/task'

type Params = Promise<{ id: string }>

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { id } = await params

  let body: UpdateTaskBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const { status, title, description } = body

  // Validate status value if provided
  if (status !== undefined && status !== 'pending' && status !== 'completed') {
    return NextResponse.json(
      { error: 'status 只能为 pending 或 completed' },
      { status: 400 }
    )
  }

  const patch: UpdateTaskBody = {}
  if (status !== undefined) patch.status = status
  if (title?.trim()) patch.title = title.trim()
  if (description !== undefined) patch.description = description?.trim() || null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  // PGRST116 = "Row not found" — .single() throws when 0 rows matched
  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { id } = await params

  const { error, count } = await supabase
    .from('tasks')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (count === 0) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }
  return new NextResponse(null, { status: 204 })
}
