'use client'

import { useState, useEffect } from 'react'
import { Task } from '@/types/task'
import TaskItem from './TaskItem'
import AddTaskForm from './AddTaskForm'

export interface TaskNode extends Task {
  children: TaskNode[]
}

function buildTree(tasks: Task[]): TaskNode[] {
  const map = new Map<string, TaskNode>()
  tasks.forEach(t => map.set(t.id, { ...t, children: [] }))

  const roots: TaskNode[] = []
  tasks.forEach(t => {
    const node = map.get(t.id)!
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node)
    } else if (!t.parent_id) {
      roots.push(node)
    }
  })
  return roots
}

// Decorative tape strip component
function Tape({ color, rotate, left, width }: { color: string; rotate: number; left: string; width: string }) {
  return (
    <div
      className="absolute -top-4 h-8 tape-texture rounded-sm shadow-sm opacity-80"
      style={{ backgroundColor: color, transform: `rotate(${rotate}deg)`, left, width }}
    />
  )
}

export default function TodoApp() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breakingDown, setBreakingDown] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setTasks(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function addTask(title: string) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const task = await res.json()
    if (!res.ok) throw new Error(task.error)
    setTasks(prev => [task, ...prev])
  }

  async function toggleTask(id: string, status: 'pending' | 'completed') {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const prev = status === 'completed' ? 'pending' : 'completed'
      setTasks(tasks => tasks.map(t => t.id === id ? { ...t, status: prev } : t))
    }
  }

  async function deleteTask(id: string) {
    // Collect id + all descendant ids to remove from local state
    const toDelete = new Set<string>()
    function collect(tid: string) {
      toDelete.add(tid)
      tasks.filter(t => t.parent_id === tid).forEach(t => collect(t.id))
    }
    collect(id)
    setTasks(prev => prev.filter(t => !toDelete.has(t.id)))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  async function breakdownTask(task: Task) {
    setBreakingDown(task.id)
    try {
      const res = await fetch('/api/tasks/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, title: task.title }),
      })
      const data = await res.json()
      if (res.ok) {
        setTasks(prev => [...prev, ...data.subtasks])
      }
    } finally {
      setBreakingDown(null)
    }
  }

  const tree = buildTree(tasks)
  const topLevel = tasks.filter(t => !t.parent_id)
  const doneCount = topLevel.filter(t => t.status === 'completed').length

  const today = new Date()
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

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
        {/* Tape decorations at top */}
        <Tape color="rgba(253,230,138,0.75)" rotate={-2} left="10%" width="72px" />
        <Tape color="rgba(167,243,208,0.75)" rotate={1.5} left="65%" width="64px" />

        {/* Page header */}
        <div className="relative z-10 pt-8 pb-2 px-4 pl-[72px] border-b border-rule">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-ink font-hand leading-tight tracking-wide">
                待办清单
              </h1>
              <p className="text-ink-light text-lg font-hand mt-0.5">{dateStr}</p>
            </div>
            {/* Stats badge */}
            {topLevel.length > 0 && (
              <div className="mt-1 text-right font-hand text-ink-light text-base leading-relaxed">
                <div className="text-2xl font-bold text-ink">{doneCount} / {topLevel.length}</div>
                <div className="text-sm">已完成</div>
              </div>
            )}
          </div>
        </div>

        {/* Add task form */}
        <div className="relative z-10">
          <AddTaskForm onAdd={addTask} />
        </div>

        {/* Divider — looks like a ruled separator */}
        <div className="mx-[72px] border-t border-dashed border-ink-light/20 my-1" />

        {/* Task list */}
        <div className="relative z-10 pb-12 pt-1">
          {loading ? (
            <div className="text-center py-20 font-hand text-ink-light text-xl">
              <span className="scribble inline-block">✎</span> 加载中…
            </div>
          ) : error ? (
            <div className="text-center py-16 font-hand">
              <div className="text-4xl mb-3">📎</div>
              <p className="text-red-500 text-xl">无法连接数据库</p>
              <p className="text-ink-light text-base mt-1">{error}</p>
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-20 font-hand text-ink-light">
              <div className="text-5xl mb-4 opacity-50">📝</div>
              <p className="text-xl">空空如也，写下今天的计划吧</p>
            </div>
          ) : (
            tree.map(node => (
              <TaskItem
                key={node.id}
                node={node}
                breakingDown={breakingDown}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onBreakdown={breakdownTask}
              />
            ))
          )}
        </div>

        {/* Page bottom — torn paper edge effect */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.04))',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        />

        {/* Page number */}
        <div className="absolute bottom-2 right-4 font-hand text-ink-light/40 text-sm z-10">
          — 1 —
        </div>
      </div>
    </div>
  )
}
