import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { CreateTaskBody } from '@/types/task'

export async function GET() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  let body: CreateTaskBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const { title, description, parent_id } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '任务标题不能为空' }, { status: 400 })
  }

  const payload: CreateTaskBody & { status: string } = {
    title: title.trim(),
    status: 'pending',
  }
  if (description?.trim()) payload.description = description.trim()
  if (parent_id) payload.parent_id = parent_id

  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
