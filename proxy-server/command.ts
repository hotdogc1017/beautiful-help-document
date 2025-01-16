import type { Handler } from './types.deno.d.ts'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { streamText } from 'ai'

interface Command {
  name: string
  section?: number
}

const deepseek = createDeepSeek({
  apiKey: 'your_key',
})

function generateEventStreamData(data: string, event?: string) {
  const eventLine = event ? `event: ${event}\n` : ''
  const dataLine = `data: ${JSON.stringify({ data })}\n\n`
  return eventLine + dataLine
}

function streamMarkdownResponse(html: string, abortSignal: AbortSignal) {
  const { fullStream } = streamText({
    model: deepseek('deepseek-chat'),
    prompt: `将以下HTML优化为markdown格式, 记住, 你的回答只需要给我结果。${html}`,
    abortSignal,
  })

  return fullStream
}

export function handler(): Handler {
  const abortController = new AbortController()

  const test = (req: Request) => {
    const url = new URL(req.url)
    return url.pathname === '/man/command'
  }

  const handler = async (req: Request) => {
    const { searchParams } = new URL(req.url)
    const command = {
      name: searchParams.get('name')!,
      section: Number.parseInt(searchParams.get('section')!),
    } as Command

    const response = await fetch(`https://man7.org/linux/man-pages/man1/${command.name}.${command.section || 1}.html`)

    if (!response.ok) {
      return response
    }

    const html = await response.text()

    const body = new ReadableStream({
      async start(controller) {
        controller.enqueue(generateEventStreamData('', 'start'))

        const textStreamAI = streamMarkdownResponse(html, abortController.signal)
        for await (const fullPart of textStreamAI) {
          if (abortController.signal.aborted) {
            return
          }

          const text = (fullPart as { textDelta: string }).textDelta
          if (text === undefined) {
            continue
          }

          const result = generateEventStreamData(text, 'text')
          controller.enqueue(result)
        }

        controller.enqueue(generateEventStreamData('', 'end'))
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
