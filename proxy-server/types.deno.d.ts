export interface Handler {
  test: (req: Request) => boolean
  handler: (req: Request) => Response | Promise<Response>
  label: string
}

export type HandlerRegistry = (req: Request) => Handler
