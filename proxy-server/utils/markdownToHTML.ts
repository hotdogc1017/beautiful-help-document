import markdownit from 'markdown-it'

const md = markdownit()

interface MarkdownToHTMLOptions {
  filename: string
  locale: Intl.Locale
  title?: string
}

export default function (markdown: string, options: MarkdownToHTMLOptions) {
  let { title, filename, locale = new Intl.Locale('zh-CN') } = options || {}

  if (!filename) {
    throw new Error('filename is required')
  }

  title ||= `${filename}-${locale.baseName}`
  const html = md.render(markdown)

  return `
    <!doctype html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title}</title>
        </head>
        <body>
            <div id="app">
                ${html}
            </div>
        </body>
    </html>
    `
}
