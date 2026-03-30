import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { deepseek } from '@/lib/deepseek'

interface BreakdownBody {
  task_id: string
  title: string
}

interface SubTask {
  title: string
  description?: string
}

export async function POST(request: Request) {
  // ── 1. 解析请求体 ───────────────────────────────────────────────────────────
  let body: BreakdownBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const { task_id, title } = body
  if (!task_id?.trim()) {
    return NextResponse.json({ error: 'task_id 不能为空' }, { status: 400 })
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: 'title 不能为空' }, { status: 400 })
  }

  // ── 2. 确认父任务存在 ────────────────────────────────────────────────────────
  const { data: parent, error: parentError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', task_id)
    .single()

  if (parentError?.code === 'PGRST116' || !parent) {
    return NextResponse.json({ error: '父任务不存在' }, { status: 404 })
  }
  if (parentError) {
    return NextResponse.json({ error: parentError.message }, { status: 500 })
  }

  // ── 3. 调用 DeepSeek 拆解任务 ────────────────────────────────────────────────
  let subtasks: SubTask[]
  try {
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `你是一个任务拆解助手。用户会给你一个任务，你需要将其拆解为 3-5 个具体可执行的子步骤。
严格按照以下 JSON 格式返回，不要添加任何多余内容：
{
  "subtasks": [
    { "title": "子任务标题", "description": "简短说明（可选，不超过50字）" }
  ]
}`,
        },
        {
          role: 'user',
          content: `请将以下任务拆解为 3-5 个子步骤：${title.trim()}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed.subtasks) || parsed.subtasks.length === 0) {
      throw new Error('AI 返回格式不符合预期')
    }

    subtasks = parsed.subtasks
      .slice(0, 5)
      .filter((s: SubTask) => typeof s.title === 'string' && s.title.trim())
      .map((s: SubTask) => ({
        title: s.title.trim(),
        ...(s.description?.trim() ? { description: s.description.trim() } : {}),
      }))

    if (subtasks.length < 1) {
      throw new Error('AI 未返回有效子任务')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI 调用失败'
    return NextResponse.json({ error: `AI 拆解失败：${msg}` }, { status: 502 })
  }

  // ── 4. 批量写入数据库 ────────────────────────────────────────────────────────
  const rows = subtasks.map((s) => ({
    title: s.title,
    ...(s.description ? { description: s.description } : {}),
    status: 'pending' as const,
    parent_id: task_id,
  }))

  const { data: created, error: insertError } = await supabase
    .from('tasks')
    .insert(rows)
    .select()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // ── 5. 返回结果 ──────────────────────────────────────────────────────────────
  return NextResponse.json(
    { parent_id: task_id, subtasks: created },
    { status: 201 }
  )
}
