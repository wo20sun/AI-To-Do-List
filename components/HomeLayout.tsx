'use client'

import { useState } from 'react'
import TodoApp from './TodoApp'
import PromptGen from './PromptGen'

type Tab = 'todo' | 'prompt'

const TABS: { id: Tab; label: string }[] = [
  { id: 'todo', label: '待办清单' },
  { id: 'prompt', label: '提示词生成' },
]

export default function HomeLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('todo')

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex justify-center pt-5 pb-0 px-4 gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-1.5 font-hand text-lg rounded-t border transition-all ${
              activeTab === id
                ? 'bg-[#faf5ea] text-ink border-ink/20 border-b-[#faf5ea] -mb-px relative z-10'
                : 'bg-transparent text-ink-light border-transparent hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={activeTab === 'todo' ? undefined : 'hidden'}><TodoApp /></div>
      <div className={activeTab === 'prompt' ? undefined : 'hidden'}><PromptGen /></div>
    </div>
  )
}
