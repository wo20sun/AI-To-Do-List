'use client'

import { Task } from '@/types/task'
import { TaskNode } from './TodoApp'

interface Props {
  node: TaskNode
  depth?: number
  breakingDown: string | null
  onToggle: (id: string, status: 'pending' | 'completed') => void
  onDelete: (id: string) => void
  onBreakdown: (task: Task) => void
}

// Deterministic tape color from task id
const TAPE_COLORS = [
  'rgba(251,207,232,0.65)',  // pink
  'rgba(167,243,208,0.65)',  // mint
  'rgba(147,197,253,0.65)',  // blue
  'rgba(253,230,138,0.65)',  // yellow
  'rgba(196,181,253,0.65)',  // lavender
]
function tapeColor(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return TAPE_COLORS[hash % TAPE_COLORS.length]
}

// Hand-drawn checkbox SVG
function HandCheckbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={checked ? '标记为未完成' : '标记为完成'}
      className="flex-shrink-0 w-7 h-7 flex items-center justify-center hover:scale-110 transition-transform"
    >
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        {/* Wobbly hand-drawn square */}
        <path
          d="M4.5,5 C7,4.2 19,4 21.5,4.8 C22,7 22,19 21.2,21.5 C19,22 7,22.2 4.8,21.5 C4.2,19 4,7 4.5,5 Z"
          stroke="#5c3d2e"
          strokeWidth="1.6"
          fill={checked ? '#f5edd6' : 'white'}
          strokeLinejoin="round"
        />
        {checked && (
          // Hand-drawn checkmark
          <path
            d="M8,13 C9,14 10.5,16 12,16.5 C14,13 17,9.5 19,8"
            stroke="#5c3d2e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </svg>
    </button>
  )
}

export default function TaskItem({ node, depth = 0, breakingDown, onToggle, onDelete, onBreakdown }: Props) {
  const isDone = node.status === 'completed'
  const isBreaking = breakingDown === node.id
  const hasChildren = node.children.length > 0
  const color = tapeColor(node.id)

  return (
    <div className={depth > 0 ? 'mt-1' : 'mt-0'}>
      {/* Task row */}
      <div
        className="relative group flex items-center gap-2 py-1.5 px-2 rounded"
        style={{ paddingLeft: depth === 0 ? '72px' : '16px' }}
      >
        {/* Washi tape for completed tasks */}
        {isDone && (
          <div
            className="tape-texture absolute inset-x-2 pointer-events-none rounded-sm"
            style={{
              top: '50%',
              height: '28px',
              transform: 'translateY(-50%) rotate(-0.4deg)',
              backgroundColor: color,
              zIndex: 1,
            }}
          />
        )}

        {/* Checkbox */}
        <div className="relative z-10 flex-shrink-0">
          <HandCheckbox
            checked={isDone}
            onClick={() => onToggle(node.id, isDone ? 'pending' : 'completed')}
          />
        </div>

        {/* Title */}
        <span
          className={`relative z-10 flex-1 text-xl leading-snug transition-colors select-text
            ${isDone ? 'line-through text-ink-light/60' : 'text-ink'}`}
        >
          {node.title}
          {node.description && (
            <span className="ml-2 text-base text-ink-light/50">— {node.description}</span>
          )}
        </span>

        {/* Action buttons — appear on hover */}
        <div className="relative z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Breakdown button — only for top-level tasks without children */}
          {depth === 0 && !hasChildren && (
            <button
              onClick={() => onBreakdown(node)}
              disabled={isBreaking || !!breakingDown}
              title="AI 拆解任务"
              className="px-2 py-0.5 text-base font-hand text-amber-800 border border-amber-400/60
                bg-amber-50 rounded hover:bg-amber-100 disabled:opacity-40
                shadow-[1px_1px_0_rgba(101,67,33,0.2)] transition-all"
            >
              {isBreaking ? (
                <span className="scribble inline-block">✎ 拆解中…</span>
              ) : '✂ 拆解'}
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={() => onDelete(node.id)}
            title="删除"
            className="w-7 h-7 flex items-center justify-center text-lg text-red-400/70
              hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Children — indented with dashed connector */}
      {hasChildren && (
        <div
          className="border-l-2 border-dashed border-amber-300/60 ml-[88px] pl-3 mt-0.5 mb-1"
        >
          {node.children.map(child => (
            <TaskItem
              key={child.id}
              node={child}
              depth={depth + 1}
              breakingDown={breakingDown}
              onToggle={onToggle}
              onDelete={onDelete}
              onBreakdown={onBreakdown}
            />
          ))}
        </div>
      )}
    </div>
  )
}
