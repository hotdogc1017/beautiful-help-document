import type { TextStreamPart } from 'ai'

interface GenerateEventStreamDataOptions {
  data: string
  event?: string
}

type GenerateEventStreamDataStatus = 'start' | 'end' | 'finish'

export function generateEventStreamData(input:
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
