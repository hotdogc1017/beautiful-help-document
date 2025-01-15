import type { Handler } from './types.deno.d.ts'
import { handler as commandHandler } from './command.ts'

function handlerRegistry() {
  const handlers = [] as Handler[]

  const registry = (handler: Handler) => {
    handlers.push(handler)
  }

  const exec = (req: Request) => {
    const handler = handlers.find(({ test }) => test?.(req))

    if (handler) {
      return handler.handler(req)
    }
    else {
      return new Response(null, { status: 404 })
    }
  }

  return { registry, exec }
}

const { registry, exec } = handlerRegistry()

registry(commandHandler())

const server = Deno.serve(exec)

server.finished.finally(() => {
  console.log(`Bye ~`)
})
