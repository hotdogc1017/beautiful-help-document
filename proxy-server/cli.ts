#!/usr/bin/env -S deno run --ext=js --allow-env --allow-net --allow-read --allow-write --unstable

import { parseArgs } from '@std/cli'
import { streamConvertInputToMarkdownByAI } from './utils/markdown.ts'

const args = parseArgs(Deno.args, {
  string: ['prompt'],
  boolean: ['help'],
  alias: {
    prompt: 'p',
    help: 'h',
  },
})

const helpMessage = `Usage: cli.ts [options]
--help,-h Output help information
--prompt,-p Message sent to the large language model`

if (args.help) {
  console.log(helpMessage)
}
else {
  const decoder = new TextDecoder()
  for await (const chunk of Deno.stdin.readable) {
    const input = decoder.decode(chunk)

    const { textStream } = streamConvertInputToMarkdownByAI(input, {
      prompt: args.prompt ?? `将以下内容翻译为中文, 记住, 你的回答只需要给我结果。${input}`,
    })

    textStream
      .pipeThrough(new TextEncoderStream())
      .pipeTo(Deno.stdout.writable)
  }
}
