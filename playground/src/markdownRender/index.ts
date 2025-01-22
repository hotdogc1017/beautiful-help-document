export { default as MarkdownRender } from './MarkdownRender.vue'

export function extractContent(input: string) {
  const re = /(?<=```markdown\n).*/gs

  const [unPrefixContent] = input.match(re) ?? []

  if (!unPrefixContent) {
    return input
  }

  const [content] = unPrefixContent.match(/.*(?=\n```)/gs) ?? [unPrefixContent]

  return content
}
