'use client'

import { useState } from 'react'

function Tape({ color, rotate, left, width }: { color: string; rotate: number; left: string; width: string }) {
  return (
    <div
      className="absolute -top-4 h-8 tape-texture rounded-sm shadow-sm opacity-80"
      style={{ backgroundColor: color, transform: `rotate(${rotate}deg)`, left, width }}
    />
  )
}

export default function PromptGen() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    if (!input.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult('')

    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRequest: input }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen py-12 px-4 flex justify-center items-start">
      {/* Notebook page */}
      <div
        className="relative w-full max-w-xl notebook-lines paper-grain"
        style={{
          backgroundColor: '#faf5ea',
          borderRadius: '2px 2px 4px 4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 10px 30px rgba(0,0,0,0.15), 2px 0 4px rgba(0,0,0,0.05)',
          minHeight: '80vh',
        }}
      >
        {/* Tape decorations */}
        <Tape color="rgba(196,181,253,0.75)" rotate={-1.5} left="15%" width="68px" />
        <Tape color="rgba(252,211,77,0.75)" rotate={2} left="68%" width="60px" />

        {/* Page header */}
        <div className="relative z-10 pt-8 pb-3 px-4 pl-[72px] border-b border-rule">
          <h1 className="text-4xl font-bold text-ink font-hand leading-tight tracking-wide">
            提示词生成
          </h1>
          <p className="text-ink-light text-base font-hand mt-0.5">
            输入你的想法，AI 将帮你生成结构化提示词
          </p>
        </div>

        {/* Input area */}
        <div className="relative z-10 px-4 pl-[72px] pt-4">
          <label className="block font-hand text-ink-light text-sm mb-1.5">你的原始需求</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="例如：帮我写一个排序算法，要求高效且易读"
            rows={4}
            className="w-full bg-transparent border border-ink/15 rounded px-3 py-2 font-hand text-ink text-base resize-none focus:outline-none focus:border-ink/40 placeholder:text-ink-light/50"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
            }}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-ink-light/50 font-hand text-xs">⌘Enter 快速生成</span>
            <button
              onClick={handleGenerate}
              disabled={!input.trim() || loading}
              className="px-5 py-1.5 font-hand text-base rounded border border-ink/20 text-ink bg-transparent hover:bg-ink/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="scribble inline-block">✎</span>
              ) : (
                '生成提示词 →'
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-[72px] border-t border-dashed border-ink-light/20 my-3" />

        {/* Result area */}
        <div className="relative z-10 px-4 pl-[72px] pb-12">
          {error && (
            <div className="font-hand text-red-400 text-base py-4">
              <span className="mr-2">📎</span>{error}
            </div>
          )}

          {loading && (
            <div className="text-center py-12 font-hand text-ink-light text-xl">
              <span className="scribble inline-block">✎</span> 正在生成…
            </div>
          )}

          {result && !loading && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-hand text-ink-light text-sm">生成结果</span>
                <button
                  onClick={handleCopy}
                  className="font-hand text-sm text-ink-light hover:text-ink transition-colors px-2 py-0.5 rounded border border-ink/10 hover:border-ink/30"
                >
                  {copied ? '已复制 ✓' : '复制'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-hand text-ink text-sm leading-relaxed bg-ink/[0.02] border border-ink/10 rounded p-3 overflow-auto">
                {result}
              </pre>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center py-16 font-hand text-ink-light">
              <div className="text-5xl mb-4 opacity-50">✨</div>
              <p className="text-xl">在上方输入你的想法，开始优化</p>
            </div>
          )}
        </div>

        {/* Page bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.04))',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        />

        {/* Page number */}
        <div className="absolute bottom-2 right-4 font-hand text-ink-light/40 text-sm z-10">
          — 2 —
        </div>
      </div>
    </div>
  )
}
