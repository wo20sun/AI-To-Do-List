import OpenAI from 'openai'

export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: 'https://sg.uiuiapi.com/v1',
})
