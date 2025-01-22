<script lang="ts" setup>
import markdownit from 'markdown-it'
import { nextTick, ref, watch } from 'vue'
import 'github-markdown-css'

const props = defineProps<{
  text: string
}>()

const md = ref(markdownit())
const renderMarkdownRef = ref<HTMLElement | null>()

watch(() => props.text, async (text) => {
  const parsedHTML = md.value.render(text)
  await nextTick()
  renderMarkdownRef.value!.innerHTML = parsedHTML
})
</script>

<template>
  <article ref="renderMarkdownRef" class="markdown-body" />
</template>

<style>
.markdown-body {
box-sizing: border-box;
box-sizing: border-box;
min-width: 200px;
max-width: 980px;
margin: 0 auto;
padding: 45px;
}

@media (max-width: 767px) {
.markdown-body {
padding: 15px;
}
}
</style>
