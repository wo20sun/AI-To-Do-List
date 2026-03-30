import type { Metadata } from 'next'
import { Caveat } from 'next/font/google'
import './globals.css'

const caveat = Caveat({ subsets: ['latin'], weight: ['400', '600', '700'] })

export const metadata: Metadata = {
  title: '手账待办',
  description: '复古手账风格任务管理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={caveat.className}>{children}</body>
    </html>
  )
}
