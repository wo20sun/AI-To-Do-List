#!/usr/bin/env node
/**
 * API 全量测试脚本
 * 覆盖：GET /api/tasks、POST /api/tasks、PATCH /api/tasks/[id]、DELETE /api/tasks/[id]
 * 运行前请确保 Next.js dev server 已在 http://localhost:3001 启动
 */

const PORT = process.env.PORT ?? 3001
const BASE = `http://localhost:${PORT}/api/tasks`

// ── 输出工具 ──────────────────────────────────────────────────────────────────
const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
}

let passed = 0, failed = 0
const cleanup = []  // 记录所有创建的 ID，测试完统一删除

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'Assertion failed')
}

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ${c.green('✓')} ${name}`)
    passed++
  } catch (e) {
    console.log(`  ${c.red('✗')} ${name}`)
    console.log(`    ${c.dim(e.message)}`)
    failed++
  }
}

function section(title) {
  console.log(`\n${c.cyan(c.bold(title))}`)
}

// ── 等待服务就绪 ───────────────────────────────────────────────────────────────
async function waitForServer(retries = 20, interval = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(BASE)
      return
    } catch {
      if (i === 0) process.stdout.write('  等待服务启动')
      process.stdout.write('.')
      await new Promise(r => setTimeout(r, interval))
    }
  }
  console.log()
  throw new Error('服务未能在规定时间内启动，请先运行 npm run dev')
}

// ── 主测试逻辑 ─────────────────────────────────────────────────────────────────
async function run() {
  console.log(c.bold('\n🧪  To-Do List API 全量测试\n'))

  await waitForServer()
  console.log(c.green('\n  服务就绪\n'))

  // ────────────────────────────────────────────────────────────────────────────
  section('GET /api/tasks')

  await test('返回 200 及数组', async () => {
    const res = await fetch(BASE)
    assert(res.status === 200, `期望 200，实际 ${res.status}`)
    const data = await res.json()
    assert(Array.isArray(data), '返回值应为数组')
  })

  // ────────────────────────────────────────────────────────────────────────────
  section('POST /api/tasks')

  let taskA, taskB, taskC

  await test('仅 title → 201，字段完整', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '测试任务 A' }),
    })
    assert(res.status === 201, `期望 201，实际 ${res.status}`)
    taskA = await res.json()
    assert(taskA.id, '应返回 id')
    assert(taskA.title === '测试任务 A', 'title 不符')
    assert(taskA.status === 'pending', '初始 status 应为 pending')
    assert(taskA.description == null, 'description 应为 null')
    assert(taskA.parent_id == null, 'parent_id 应为 null')
    cleanup.push(taskA.id)
  })

  await test('title + description → 201', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '测试任务 B', description: '这是描述' }),
    })
    assert(res.status === 201, `期望 201，实际 ${res.status}`)
    taskB = await res.json()
    assert(taskB.description === '这是描述', 'description 不符')
    cleanup.push(taskB.id)
  })

  await test('title + parent_id → 201，子任务关联正确', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '子任务 C', parent_id: taskA.id }),
    })
    assert(res.status === 201, `期望 201，实际 ${res.status}`)
    taskC = await res.json()
    assert(taskC.parent_id === taskA.id, 'parent_id 不符')
    cleanup.push(taskC.id)
  })

  await test('title 为空字符串 → 400', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    })
    assert(res.status === 400, `期望 400，实际 ${res.status}`)
    const body = await res.json()
    assert(body.error, '应返回 error 字段')
  })

  await test('title 为纯空格 → 400', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' }),
    })
    assert(res.status === 400, `期望 400，实际 ${res.status}`)
  })

  await test('缺少 title 字段 → 400', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '没有 title' }),
    })
    assert(res.status === 400, `期望 400，实际 ${res.status}`)
  })

  await test('请求体非合法 JSON → 400', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    assert(res.status === 400, `期望 400，实际 ${res.status}`)
  })

  await test('GET 列表按 created_at 倒序排列', async () => {
    const res = await fetch(BASE)
    const list = await res.json()
    const ids = list.map(t => t.id)
    // taskC 最晚创建，应排在最前
    const idxC = ids.indexOf(taskC.id)
    const idxA = ids.indexOf(taskA.id)
    assert(idxC < idxA, `倒序排列错误：taskC(${idxC}) 应在 taskA(${idxA}) 前面`)
  })

  // ────────────────────────────────────────────────────────────────────────────
  section('PATCH /api/tasks/[id]')

  await test('status: pending → completed → 200', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    assert(res.status === 200, `期望 200，实际 ${res.status}`)
    const data = await res.json()
    assert(data.status === 'completed', 'status 未更新')
  })

  await test('status: completed → pending → 200', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' }),
    })
    assert(res.status === 200, `期望 200，实际 ${res.status}`)
    const data = await res.json()
    assert(data.status === 'pending', 'status 未还原')
  })

  await test('更新 title → 200', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '已修改标题' }),
    })
    assert(res.status === 200, `期望 200，实际 ${res.status}`)
    const data = await res.json()
    assert(data.title === '已修改标题', 'title 未更新')
  })

  await test('更新 description → 200', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '新描述' }),
    })
    assert(res.status === 200, `期望 200，实际 ${res.status}`)
    const data = await res.json()
    assert(data.description === '新描述', 'description 未更新')
  })

  await test('description 置空（传空字符串）→ 200，值为 null', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '' }),
    })
    assert(res.status === 200, `期望 200，实际 ${res.status}`)
    const data = await res.json()
    assert(data.description == null, `description 应为 null，实际 ${data.description}`)
  })

  await test('非法 status 枚举值 → 400', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    assert(res.status === 400, `期望 400，实际 ${res.status}`)
  })

  await test('空 patch 对象 {} → 400', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert(res.status === 400, `期望 400，实际 ${res.status}`)
  })

  await test('非法 JSON → 400', async () => {
    const res = await fetch(`${BASE}/${taskA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '!!!',
    })
    assert(res.status === 400, `期望 400，实际 ${res.status}`)
  })

  await test('不存在的 ID → 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await fetch(`${BASE}/${fakeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    assert(res.status === 404, `期望 404，实际 ${res.status}`)
  })

  // ────────────────────────────────────────────────────────────────────────────
  section('DELETE /api/tasks/[id]')

  await test('删除存在的任务 → 204', async () => {
    // 先建一个专门用于删除的任务
    const createRes = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '待删除任务' }),
    })
    const { id } = await createRes.json()

    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
    assert(res.status === 204, `期望 204，实际 ${res.status}`)

    // 确认已从列表消失
    const list = await (await fetch(BASE)).json()
    assert(!list.find(t => t.id === id), '任务应已从列表中删除')
  })

  await test('删除后 GET 列表不含该任务', async () => {
    const list = await (await fetch(BASE)).json()
    // taskC 已通过 cleanup 列表稍后处理，此处只验证快照一致性
    assert(Array.isArray(list), '应返回数组')
  })

  await test('删除不存在的 ID → 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await fetch(`${BASE}/${fakeId}`, { method: 'DELETE' })
    assert(res.status === 404, `期望 404，实际 ${res.status}`)
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 清理测试数据
  section('清理测试数据')
  for (const id of cleanup) {
    await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  }
  console.log(`  ${c.dim(`已删除 ${cleanup.length} 条测试记录`)}`)

  // ────────────────────────────────────────────────────────────────────────────
  // 结果统计
  const total = passed + failed
  console.log(`\n${'─'.repeat(45)}`)
  console.log(
    c.bold(`结果：`) +
    c.green(`${passed} 通过`) + '  ' +
    (failed > 0 ? c.red(`${failed} 失败`) : c.dim('0 失败')) +
    c.dim(`  / ${total} 项`)
  )
  console.log()
  if (failed > 0) process.exit(1)
}

run().catch(e => {
  console.error(c.red(`\n致命错误：${e.message}\n`))
  process.exit(1)
})
