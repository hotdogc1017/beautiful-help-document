import { createDeepSeek } from '@ai-sdk/deepseek'
import { type CoreTool, streamText, type StreamTextResult } from 'ai'

interface UseHTMLtoMarkdownOptions {
  apiKey: string
}

function canParseURL(input: string) {
  if (URL.canParse) {
    return URL.canParse(input)
  }

  try {
    new URL(input)
    return true
  }
  catch {
    return false
  }
}

export function extractHTMLBody(html: string) {
  const dom = new DOMParser().parseFromString(html, 'text/html').body

  dom.querySelectorAll('script').forEach(script => script.remove())
  dom.querySelectorAll('style').forEach(style => style.remove())
  dom.querySelectorAll('form').forEach(head => head.remove())
  dom.querySelectorAll('input').forEach(head => head.remove())
  dom.querySelectorAll('button').forEach(head => head.remove())
  dom.querySelectorAll('textarea').forEach(head => head.remove())
  dom.querySelectorAll('select').forEach(head => head.remove())
  dom.querySelectorAll('option').forEach(head => head.remove())
  dom.querySelectorAll('optgroup').forEach(head => head.remove())
  dom.querySelectorAll('fieldset').forEach(head => head.remove())
  dom.querySelectorAll('legend').forEach(head => head.remove())
  dom.querySelectorAll('label').forEach(head => head.remove())
  dom.querySelectorAll('datalist').forEach(head => head.remove())
  dom.querySelectorAll('output').forEach(head => head.remove())
  dom.querySelectorAll('progress').forEach(head => head.remove())
  dom.querySelectorAll('meter').forEach(head => head.remove())
  dom.querySelectorAll('details').forEach(head => head.remove())
  dom.querySelectorAll('summary').forEach(head => head.remove())
  dom.querySelectorAll('menu').forEach(head => head.remove())
  dom.querySelectorAll('command').forEach(head => head.remove())
  dom.querySelectorAll('dialog').forEach(head => head.remove())
  dom.querySelectorAll('embed').forEach(head => head.remove())
  dom.querySelectorAll('object').forEach(head => head.remove())
  dom.querySelectorAll('source').forEach(head => head.remove())
  dom.querySelectorAll('track').forEach(head => head.remove())
  dom.querySelectorAll('canvas').forEach(head => head.remove())
  dom.querySelectorAll('svg').forEach(head => head.remove())
  dom.querySelectorAll('math').forEach(head => head.remove())
  dom.querySelectorAll('iframe').forEach(head => head.remove())
  dom.querySelectorAll('noscript').forEach(head => head.remove())

  Array.from(dom.childNodes)
    .forEach(element => element.nodeType === Node.COMMENT_NODE && element.remove())

  dom.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      element.removeAttributeNode(attr)
    })
  })

  // 紧凑化html内容
  const htmlString = dom.getHTML().trim()
  // .replace(/>\s+</g, '><')

  return htmlString
}

export function extractMarkdownContent(markdown: string) {
  const content = markdown.replace(/^(```markdown\n)/i, '').replace(/(\n```)$/, '')

  return content.split('\n').map(line => line.trimStart()).join('\n')
}

export default function useHTMLtoMarkdown(options: UseHTMLtoMarkdownOptions) {
  const deepSeek = createDeepSeek({
    apiKey: options?.apiKey,
  })

    type InputType = RequestInfo | File

    async function getHTMLContentFromURL(url: string) {
      return `这是HTML内容链接: ${url}`
    }

    // 使用 File API 实现从 File 对象读取 HTML 内容，并检查文件类型
    async function getHTMLContentFromFile(file: File) {
      if (!/html/.test(file.type)) {
        throw new Error('文件类型不是html')
      }
      return await file.text()
    }

    async function convertToMarkdown(input: InputType): Promise<StreamTextResult<Record<string, CoreTool>, any>> {
      const getHTMLContent = async () => {
        switch (typeof input) {
          case 'string':
            if (canParseURL(input)) {
              return getHTMLContentFromURL(input)
            }
            break
          case 'object':
            if (input instanceof File) {
              return await getHTMLContentFromFile(input)
            }
            break
          default:
            throw new Error('不支持的输入类型')
        }
      }

      return streamText({
        model: deepSeek('deepseek-chat'),
        prompt: `将以下HTML内容转换为Markdown格式并翻译为中文, 记住, 你的回答只需要给我结果: ${await getHTMLContent()}`,
      })
    }

    return {
      convertToMarkdown,
    }
}
