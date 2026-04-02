import { NextResponse } from 'next/server'
import { deepseek } from '@/lib/deepseek'
import fs from 'fs'
import path from 'path'

interface PromptBody {
  userRequest: string
}

export async function POST(request: Request) {
  // ── 1. 解析请求体 ───────────────────────────────────────────────────────────
  let body: PromptBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
  }

  const { userRequest } = body
  if (!userRequest?.trim()) {
    return NextResponse.json({ error: '用户需求不能为空' }, { status: 400 })
  }

  // ── 2. 读取元提示词并替换占位符 ──────────────────────────────────────────────
  const metaPromptPath = path.join(process.cwd(), 'prompts', '第四讲-元提示词.md')
  let metaPrompt: string
  try {
    metaPrompt = fs.readFileSync(metaPromptPath, 'utf-8')
  } catch {
    return NextResponse.json({ error: '元提示词文件读取失败' }, { status: 500 })
  }

  const systemPrompt = metaPrompt
    .replace('{{user_request}}', userRequest.trim())
    .replace('{{user_input}}', userRequest.trim())

  // ── 3. 调用 DeepSeek 生成优化后的提示词 ─────────────────────────────────────
  try {
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userRequest.trim(),
        },
      ],
    })

    const result = completion.choices[0]?.message?.content ?? ''
    if (!result) {
      return NextResponse.json({ error: 'AI 未返回内容' }, { status: 502 })
    }

    return NextResponse.json({ result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI 调用失败'
    return NextResponse.json({ error: `AI 调用失败：${msg}` }, { status: 502 })
  }
}
