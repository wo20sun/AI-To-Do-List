'use client'

import { useState, useRef } from 'react'

interface Props {
  onAdd: (title: string) => Promise<void>
}

export default function AddTaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || loading) return
    setLoading(true)
    await onAdd(trimmed)
    setTitle('')
    setLoading(false)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 pl-[72px] pr-4 py-3">
      {/* Pencil icon */}
      <span className="text-2xl mb-1 select-none" style={{ transform: 'rotate(-15deg)', display: 'inline-block' }}>
        ✏️
      </span>

      <div className="flex-1">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="记录新任务…"
          maxLength={100}
          className="w-full bg-transparent border-b-2 border-ink-light/40 focus:border-ink
            text-xl text-ink placeholder-ink-light/40 outline-none pb-0.5
            font-hand transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={!title.trim() || loading}
        className="px-4 py-1 font-hand text-lg text-amber-900
          bg-amber-100 border-2 border-amber-800/60 rounded
          shadow-[2px_2px_0_rgba(101,67,33,0.25)]
          hover:shadow-[1px_1px_0_rgba(101,67,33,0.2)]
          hover:translate-x-px hover:translate-y-px
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all active:scale-95"
      >
        {loading ? '记录中…' : '＋ 添加'}
      </button>
    </form>
  )
}
