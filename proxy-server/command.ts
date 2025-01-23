import type { Handler } from './types.deno.d.ts'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { streamText } from 'ai'
import { generateEventStreamData } from './utils/server.ts'

interface Command {
  name: string
  section?: number
}

const deepseek = createDeepSeek({
  apiKey: Deno.env.get('VITE_DEEPSEEK_API_KEY')!,
})

interface StreamPrettyMarkdownByAIOptions {
  signal?: AbortSignal
}

export async function streamPrettyMarkdownByAI(command: string, section?: number, options?: StreamPrettyMarkdownByAIOptions) {
  const { signal = new AbortController().signal } = options || {}

  interface Config {
    onHTML?: (html: string) => void
  }
  const config = {
    onHTML: undefined,
  } as Config
  function onHTML(handler: (html: string) => void) {
    config.onHTML = handler
  }

  async function generate() {
    const response = await fetch(`https://man7.org/linux/man-pages/man1/${command}.${section || 1}.html`, {
      signal,
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()

    config.onHTML?.(html)

    const stream = streamText({
      model: deepseek('deepseek-chat'),
      prompt: `将以下内容优化为markdown格式, 记住, 你的回答只需要给我结果。${html}`,
      abortSignal: signal,
    })

    return stream
  }

  return { generate, onHTML }
}

export function handler(): Handler {
  const abortController = new AbortController()

  const test = (req: Request) => {
    const url = new URL(req.url)
    return url.pathname === '/man/command'
  }

  const handler = async (req: Request) => {
    req.signal.addEventListener('abort', () => {
      if (!abortController.signal.aborted) {
        abortController.abort()
      }
    })
    const { searchParams } = new URL(req.url)
    const command = {
      name: searchParams.get('name')!,
      section: Number.parseInt(searchParams.get('section')!),
    } as Command

    const { generate, onHTML } = await streamPrettyMarkdownByAI(command.name, command.section, {
      signal: abortController.signal,
    })

    const body = new ReadableStream({
      async start(controller) {
        onHTML(() => {
          controller.enqueue(generateEventStreamData('start'))
        })
        const { fullStream } = (await generate()) ?? {}

        if (!fullStream) {
          abortController.abort()
          return
        }

        for await (const fullPart of fullStream) {
          const result = generateEventStreamData(fullPart)
          controller.enqueue(result)
        }
        controller.enqueue(generateEventStreamData('end'))
      },
      cancel() {
        abortController.abort()
      },
    })

    return new Response(body.pipeThrough(new TextEncoderStream()), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'text/event-stream; charset=utf-8',
      },
    })
  }

  return { label: '命令行查询', test, handler }
}
