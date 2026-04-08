'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, getToolName, isTextUIPart } from 'ai'
import { useState, useEffect, useRef } from 'react'

function Tape({ color, rotate, left, width }: { color: string; rotate: number; left: string; width: string }) {
  return (
    <div
      className="absolute -top-4 h-8 tape-texture rounded-sm shadow-sm opacity-80"
      style={{ backgroundColor: color, transform: `rotate(${rotate}deg)`, left, width }}
    />
  )
}

export default function MultiModal() {
  const { messages, sendMessage, stop, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/multimodal' }),
  })
  const [input, setInput] = useState('')
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)
  const isLoading = status === 'streaming' || status === 'submitted'
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage({ text })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function renderPart(part: any, i: number) {
    if (isToolUIPart(part)) {
      const toolName = getToolName(part)

      if (toolName === 'generateImage') {
        if (part.state === 'input-streaming' || part.state === 'input-available') {
          return (
            <div key={i} className="font-hand text-ink-light text-sm py-1">
              <span className="scribble inline-block mr-1">✎</span>正在生成图片…
            </div>
          )
        }
        if (part.state === 'output-available') {
          const result = part.output as any
          if (result?.success && result?.imageUrl) {
            return (
              <div key={i} className="mt-2">
                <img
                  src={result.imageUrl}
                  alt={result.prompt || '生成的图片'}
                  className="max-w-full rounded border border-ink/10 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setExpandedImage(result.imageUrl)}
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => setExpandedImage(result.imageUrl)}
                    className="font-hand text-xs text-ink-light border border-ink/15 rounded px-2 py-0.5 hover:border-ink/30 transition-colors"
                  >
                    放大
                  </button>
                  <a
                    href={result.imageUrl}
                    download={`image-${Date.now()}.png`}
                    className="font-hand text-xs text-ink-light border border-ink/15 rounded px-2 py-0.5 hover:border-ink/30 transition-colors"
                  >
                    下载
                  </a>
                </div>
              </div>
            )
          }
          if (result?.error) {
            return (
              <div key={i} className="font-hand text-sm text-red-400 py-1">
                ⚠️ 图片生成失败：{result.error}
              </div>
            )
          }
        }
      }

      if (toolName === 'generateVideo') {
        if (part.state === 'input-streaming' || part.state === 'input-available') {
          return (
            <div key={i} className="font-hand text-ink-light text-sm py-1">
              <span className="scribble inline-block mr-1">✎</span>正在生成视频…
            </div>
          )
        }
        if (part.state === 'output-available') {
          const result = part.output as any
          if (result?.success && result?.videoUrl) {
            return (
              <div key={i} className="mt-2">
                <video
                  src={result.videoUrl}
                  controls
                  className="max-w-full rounded border border-ink/10 shadow-sm cursor-pointer"
                  onClick={() => setExpandedVideo(result.videoUrl)}
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => setExpandedVideo(result.videoUrl)}
                    className="font-hand text-xs text-ink-light border border-ink/15 rounded px-2 py-0.5 hover:border-ink/30 transition-colors"
                  >
                    放大
                  </button>
                  <a
                    href={result.videoUrl}
                    download={`video-${Date.now()}.mp4`}
                    className="font-hand text-xs text-ink-light border border-ink/15 rounded px-2 py-0.5 hover:border-ink/30 transition-colors"
                  >
                    下载
                  </a>
                </div>
              </div>
            )
          }
          if (result?.error) {
            return (
              <div key={i} className="font-hand text-sm text-red-400 py-1">
                ⚠️ 视频生成失败：{result.error}
              </div>
            )
          }
        }
      }

      return null
    }

    if (isTextUIPart(part) && part.text) {
      return (
        <div key={i} className="font-hand text-base leading-relaxed whitespace-pre-wrap text-ink">
          {part.text}
        </div>
      )
    }

    return null
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
        <Tape color="rgba(167,243,208,0.75)" rotate={-1.5} left="10%" width="70px" />
        <Tape color="rgba(251,207,232,0.75)" rotate={2} left="70%" width="62px" />

        {/* Header */}
        <div className="relative z-10 pt-8 pb-3 px-4 pl-[72px] border-b border-rule">
          <h1 className="text-4xl font-bold text-ink font-hand leading-tight tracking-wide">多模态 AI</h1>
          <p className="text-ink-light text-base font-hand mt-0.5">自动识别文本 · 图片 · 视频</p>
        </div>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pl-[72px] py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 font-hand text-ink-light">
              <div className="text-5xl mb-4 opacity-50">🎨</div>
              <p className="text-xl">发送消息，AI 自动识别并生成内容</p>
              <p className="text-sm mt-2 opacity-70">例如：帮我画一只猫 · 生成一段海浪视频 · 解释量子纠缠</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {message.role === 'user' ? (
                <div className="max-w-[85%] px-3 py-2 rounded font-hand text-base leading-relaxed whitespace-pre-wrap bg-ink/8 text-ink border border-ink/10">
                  {message.parts.filter(isTextUIPart).map(p => p.text).join('')}
                </div>
              ) : (
                <div className="max-w-[85%]">
                  {message.parts.map((part, i) => renderPart(part, i))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start">
              <div className="font-hand text-ink-light text-base py-2">
                <span className="scribble inline-block mr-1">✎</span>正在生成…
              </div>
            </div>
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
              disabled={isLoading}
              className="flex-1 bg-transparent border border-ink/15 rounded px-3 py-2 font-hand text-ink text-base resize-none focus:outline-none focus:border-ink/40 placeholder:text-ink-light/50 disabled:opacity-50"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="px-4 py-2 font-hand text-base rounded border border-red-300/60 text-red-400 hover:bg-red-50 transition-all whitespace-nowrap"
              >
                停止
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
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
        <div className="absolute bottom-2 right-4 font-hand text-ink-light/40 text-sm z-10">— 4 —</div>
      </div>

      {/* Image expand modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="放大图片"
            className="max-w-[90%] max-h-[90%] rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Video expand modal */}
      {expandedVideo && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
          onClick={() => setExpandedVideo(null)}
        >
          <div className="max-w-[90%] max-h-[90%]" onClick={e => e.stopPropagation()}>
            <video
              src={expandedVideo}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
