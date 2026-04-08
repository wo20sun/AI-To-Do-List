import { streamText, generateText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { z } from 'zod'
import { deepseek, nanobanana, veo3 } from '@/lib/models'

export const maxDuration = 300

const generateImage = tool({
  description: '根据用户描述生成图片。当用户明确要求生成/画/创作图片时使用。',
  inputSchema: z.object({
    prompt: z.string().describe('图片生成提示词，描述想要生成的图片内容'),
  }),
  execute: async ({ prompt }) => {
    try {
      const result = await generateText({
        model: nanobanana,
        prompt: `生成图片：${prompt}`,
      })

      let imageUrl: string | null = null

      if (result.files?.length) {
        const imageFile = result.files.find(f => f.mediaType.startsWith('image/'))
        if (imageFile) {
          imageUrl = `data:${imageFile.mediaType};base64,${imageFile.base64}`
        }
      }

      if (!imageUrl && result.text) {
        const base64Match = result.text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
        if (base64Match) imageUrl = base64Match[0]
        if (!imageUrl) {
          const httpMatch = result.text.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp)/i)
          if (httpMatch) imageUrl = httpMatch[0]
        }
      }

      if (!imageUrl) {
        return { success: false, error: '图片生成失败，未返回图片数据' }
      }

      return { success: true, imageUrl, prompt }
    } catch (error: any) {
      return { success: false, error: error.message || '图片生成失败' }
    }
  },
})

const generateVideo = tool({
  description: '根据用户描述生成视频。当用户明确要求生成/制作/创作视频时使用。',
  inputSchema: z.object({
    prompt: z.string().describe('视频生成提示词，描述想要生成的视频内容'),
  }),
  execute: async ({ prompt }) => {
    try {
      const result = await generateText({
        model: veo3,
        prompt: prompt.trim(),
      })

      let videoUrl: string | null = null

      if (result.files?.length) {
        const videoFile = result.files.find(f => f.mediaType.startsWith('video/'))
        if (videoFile) {
          videoUrl = `data:${videoFile.mediaType};base64,${videoFile.base64}`
        }
      }

      if (!videoUrl && result.text) {
        const base64Match = result.text.match(/data:video\/[^;]+;base64,[A-Za-z0-9+/=]+/)
        if (base64Match) videoUrl = base64Match[0]
        if (!videoUrl) {
          const httpMatch = result.text.match(/https?:\/\/[^\s"'<>]+\.(mp4|webm|mov|avi)/i)
          if (httpMatch) videoUrl = httpMatch[0]
        }
      }

      if (!videoUrl) {
        return { success: false, error: '视频生成失败，未返回视频数据' }
      }

      return { success: true, videoUrl, prompt }
    } catch (error: any) {
      return { success: false, error: error.message || '视频生成失败' }
    }
  },
})

export async function POST(request: Request) {
  const { messages } = await request.json()
  const modelMessages = await convertToModelMessages(messages)

  const result = await streamText({
    model: deepseek,
    system: `你是一个多模态 AI 助手，可以进行文本对话、生成图片、生成视频。
- 当用户明确要求生成/画/创作图片时，调用 generateImage 工具
- 当用户明确要求生成/制作/创作视频时，调用 generateVideo 工具
- 其他情况直接文字回复`,
    messages: modelMessages,
    tools: { generateImage, generateVideo },
    stopWhen: stepCountIs(3),
  })

  return result.toUIMessageStreamResponse()
}
