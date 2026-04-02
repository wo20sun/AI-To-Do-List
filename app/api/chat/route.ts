import { deepseek } from '@/lib/deepseek'
import pRetry from 'p-retry'
import { getEncoding } from 'js-tiktoken'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// DeepSeek-V3.2 pricing (元/token)
const INPUT_COST_PER_TOKEN = 2 / 1_000_000
const OUTPUT_COST_PER_TOKEN = 3 / 1_000_000

function countTokens(text: string): number {
  const enc = getEncoding('cl100k_base')
  return enc.encode(text).length
}

export async function POST(request: Request) {
  let body: { messages: Message[] }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: '请求体格式错误' }), { status: 400 })
  }

  const { messages } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages 不能为空' }), { status: 400 })
  }

  // Count input tokens upfront
  const inputTokens = countTokens(messages.map(m => m.content).join('\n'))

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        // Retry on 429, abort on other errors
        const completion = await pRetry(
          async () => {
            return await deepseek.chat.completions.create(
              {
                model: 'deepseek-chat',
                temperature: 0.8,
                max_tokens: 65535,
                // seed: 42,
                stream: true,
                messages,
              },
              { timeout: 120_000 }
            )
          },
          {
            retries: 5,
            onFailedAttempt: async ({ error, attemptNumber }) => {
              const status = (error as any).status ?? (error as any).statusCode
              if (status === 429) {
                const headers = (error as any).headers as Record<string, string> | undefined
                const retryAfter = headers?.['retry-after'] ?? headers?.['Retry-After']
                const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5_000
                send({ type: 'retrying', attempt: attemptNumber, waitMs })
                await new Promise(resolve => setTimeout(resolve, waitMs))
              } else {
                throw error // 非 429 错误直接中止重试
              }
            },
          }
        )

        let outputText = ''
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            outputText += delta
            send({ type: 'delta', content: delta })
          }
        }

        const outputTokens = countTokens(outputText)
        const costYuan = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN

        send({ type: 'done', inputTokens, outputTokens, costYuan })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'AI 调用失败'
        send({ type: 'error', message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
