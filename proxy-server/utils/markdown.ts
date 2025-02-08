import { createDeepSeek } from '@ai-sdk/deepseek'
import { type LanguageModelV1, streamText } from 'ai'
import markdownit from 'markdown-it'

const md = markdownit()

const deepseek = createDeepSeek({
  apiKey: Deno.env.get('VITE_DEEPSEEK_API_KEY')!,
  // apiKey: 'sk-0d5970b9959244899e8a2251202f88bb',
})

interface MarkdownToHTMLOptions {
  filename: string
  locale: Intl.Locale
  title?: string
}

interface ConvertInputToMarkdownByAIOptions {
  model?: LanguageModelV1
  prompt?: string
  abortSignal?: AbortSignal
}

export function streamConvertInputToMarkdownByAI(input: string, options?: ConvertInputToMarkdownByAIOptions) {
  const {
    model = deepseek('deepseek-chat'),
    prompt = `将以下内容优化为markdown格式, 记住, 你的回答只需要给我结果。${input}`,
    abortSignal = new AbortController().signal,
  } = options ?? {}
  return streamText({
    model,
    prompt,
    abortSignal,
  })
}

export function markdownToHTML(markdown: string, options: MarkdownToHTMLOptions) {
  let { title, filename, locale = new Intl.Locale('zh-CN') } = options || {}

  if (!filename) {
    throw new Error('filename is required')
  }

  title ||= `${filename}-${locale.baseName}`
  const html = md.render(markdown)

  return `
    <!doctype html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title}</title>
        </head>
        <body>
            <div id="app">
                ${html}
            </div>
        </body>
    </html>
    `
}
