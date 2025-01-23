#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write --unstable

import { streamConvertInputToMarkdownByAI } from './utils/markdown.ts'

const decoder = new TextDecoder()
for await (const chunk of Deno.stdin.readable) {
  const input = decoder.decode(chunk)

  const { textStream, text } = streamConvertInputToMarkdownByAI(input, {
    prompt: `将以下内容翻译为中文, 记住, 你的回答只需要给我结果。${input}`,
  })

  textStream
    .pipeThrough(new TextEncoderStream())
    .pipeTo(Deno.stdout.writable)
}
