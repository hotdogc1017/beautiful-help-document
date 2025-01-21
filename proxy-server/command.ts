import type { Handler } from './types.deno.d.ts'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { streamText, type TextStreamPart } from 'ai'

interface Command {
  name: string
  section?: number
}

const deepseek = createDeepSeek({
  apiKey: Deno.env.get('VITE_DEEPSEEK_API_KEY')!,
})

interface GenerateEventStreamDataOptions {
  data: string
  event?: string
}

type GenerateEventStreamDataStatus = 'start' | 'end' | 'finish'

function generateEventStreamData(input:
  | GenerateEventStreamDataStatus
  | GenerateEventStreamDataOptions
  | TextStreamPart<any>) {
  if (typeof input === 'string') {
    return generateEventStreamData({
      data: '',
      event: input,
    })
  }

  if ('type' in input) {
    const { type } = input

    let data: string
    if (type === 'error') {
      data = JSON.stringify(input.error)
    }
    else if (type === 'text-delta') {
      data = input.textDelta
    }
    else {
      data = `不支持处理类型: ${type}`
    }
    return generateEventStreamData({ data, event: type })
  }

  const { data, event } = input
  const eventLine = event ? `event: ${event}\n` : ''
  const dataLine = `data: ${JSON.stringify({ data })}\n\n`
  return eventLine + dataLine
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

    const response = await fetch(`https://man7.org/linux/man-pages/man1/${command.name}.${command.section || 1}.html`, {
      signal: abortController.signal,
    })

    if (!response.ok) {
      return response
    }

    const html = await response.text()

    const body = new ReadableStream({
      async start(controller) {
        controller.enqueue(generateEventStreamData('start'))

        const { fullStream } = streamText({
          model: deepseek('deepseek-chat'),
          prompt: `将以下HTML优化为markdown格式, 记住, 你的回答只需要给我结果。${html}`,
          abortSignal: abortController.signal,
        })

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
