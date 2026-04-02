'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  inputTokens?: number
  outputTokens?: number
  costYuan?: number
  retrying?: boolean
}

function Tape({ color, rotate, left, width }: { color: string; rotate: number; left: string; width: string }) {
  return (
    <div
      className="absolute -top-4 h-8 tape-texture rounded-sm shadow-sm opacity-80"
      style={{ backgroundColor: color, transform: `rotate(${rotate}deg)`, left, width }}
    />
  )
}

export default function StreamChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [retryInfo, setRetryInfo] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setStreaming(true)
    setRetryInfo(null)

    // Append empty assistant message that we'll fill in
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: '请求失败' }))
        throw new Error(err.error ?? '请求失败')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })

        // Process complete SSE messages (split by double newline)
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          let event: any
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          if (event.type === 'delta') {
            // Append only the new delta — never re-process existing content
            setMessages(prev => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + event.content }
              }
              return next
            })
          } else if (event.type === 'retrying') {
            const secs = Math.ceil(event.waitMs / 1000)
            setRetryInfo(`速率限制，${secs}s 后重试（第 ${event.attempt} 次）…`)
          } else if (event.type === 'done') {
            setRetryInfo(null)
            setMessages(prev => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  inputTokens: event.inputTokens,
                  outputTokens: event.outputTokens,
                  costYuan: event.costYuan,
                }
              }
              return next
            })
          } else if (event.type === 'error') {
            throw new Error(event.message)
          }
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      const msg = e?.message ?? 'AI 调用失败'
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, content: last.content || `⚠️ ${msg}` }
        }
        return next
      })
    } finally {
      setStreaming(false)
      setRetryInfo(null)
      abortRef.current = null
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  function handleClear() {
    if (streaming) handleStop()
    setMessages([])
    setRetryInfo(null)
  }

  return (
    <div className="min-h-screen py-12 px-4 flex justify-center items-start">
      <div
        className="relative w-full max-w-xl notebook-lines paper-grain flex flex-col"
        style={{
          backgroundColor: '#faf5ea',
          borderRadius: '2px 2px 4px 4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 10px 30px rgba(0,0,0,0.15), 2px 0 4px rgba(0,0,0,0.05)',
          minHeight: '80vh',
        }}
      >
        <Tape color="rgba(134,239,172,0.75)" rotate={-2} left="12%" width="66px" />
        <Tape color="rgba(253,186,116,0.75)" rotate={1.5} left="70%" width="62px" />

        {/* Header */}
        <div className="relative z-10 pt-8 pb-3 px-4 pl-[72px] border-b border-rule flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-ink font-hand leading-tight tracking-wide">流式 AI</h1>
            <p className="text-ink-light text-base font-hand mt-0.5">DeepSeek-V3 · 流式对话</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="font-hand text-sm text-ink-light hover:text-ink border border-ink/10 hover:border-ink/30 rounded px-2 py-0.5 transition-colors"
            >
              清空
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pl-[72px] py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 font-hand text-ink-light">
              <div className="text-5xl mb-4 opacity-50">💬</div>
              <p className="text-xl">开始一段对话吧</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded font-hand text-base leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-ink/8 text-ink border border-ink/10'
                    : 'text-ink'
                }`}
              >
                {msg.content}
                {/* Streaming cursor */}
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="inline-block w-0.5 h-4 bg-ink/40 ml-0.5 animate-pulse align-text-bottom" />
                )}
              </div>
              {/* Token / cost info */}
              {msg.role === 'assistant' && msg.inputTokens != null && (
                <div className="mt-1 font-hand text-xs text-ink-light/60 space-x-2">
                  <span>输入 {msg.inputTokens} tokens</span>
                  <span>输出 {msg.outputTokens} tokens</span>
                  <span>¥{msg.costYuan!.toFixed(6)}</span>
                </div>
              )}
            </div>
          ))}

          {retryInfo && (
            <div className="font-hand text-xs text-amber-500/80 text-center">{retryInfo}</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Divider */}
        <div className="mx-[72px] border-t border-dashed border-ink-light/20" />

        {/* Input */}
        <div className="relative z-10 px-4 pl-[72px] py-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
              rows={2}
              disabled={streaming}
              className="flex-1 bg-transparent border border-ink/15 rounded px-3 py-2 font-hand text-ink text-base resize-none focus:outline-none focus:border-ink/40 placeholder:text-ink-light/50 disabled:opacity-50"
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="px-4 py-2 font-hand text-base rounded border border-red-300/60 text-red-400 hover:bg-red-50 transition-all whitespace-nowrap"
              >
                停止
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="px-4 py-2 font-hand text-base rounded border border-ink/20 text-ink hover:bg-ink/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                发送
              </button>
            )}
          </div>
        </div>

        {/* Page bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.04))',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        />
        <div className="absolute bottom-2 right-4 font-hand text-ink-light/40 text-sm z-10">— 3 —</div>
      </div>
    </div>
  )
}
