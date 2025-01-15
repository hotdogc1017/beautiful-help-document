import type { Handler } from './types.deno.d.ts'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { streamObject, streamText } from 'ai'

interface Command {
  name: string
  section?: number
}

const deepseek = createDeepSeek({
  apiKey: 'your_key',
})

function streamMarkdownResponse(html: string) {
  const abortController = new AbortController()

  const { fullStream } = streamText({
    model: deepseek('deepseek-chat'),
    // output: 'no-schema',
    prompt: `将以下HTML优化为markdown格式, 记住, 你的回答只需要给我结果。${html}`,
    abortSignal: abortController.signal,
  })

  function generateEventStreamData(data: string, event?: string) {
    const eventLine = event ? `event: ${event}\n` : ''
    const dataLine = `data: ${JSON.stringify({ data })}\n\n`
    return eventLine + dataLine
  }

  const body = new ReadableStream({
    async start(controller) {
      for await (const fullPart of fullStream) {
        if (abortController.signal.aborted) {
          return
        }

        if (fullPart.textDelta === undefined) {
          continue
        }

        const result = generateEventStreamData(fullPart.textDelta)
        controller.enqueue(result)
      }

      // const fullText = await text
      // controller.enqueue(generateEventStreamData(JSON.stringify({ data: fullText }), 'finished'))
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

export function handler(): Handler {
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

    console.log(`已读取到源html`)

    return streamMarkdownResponse(html)
  }

  return { label: '命令行查询', test, handler }
}
