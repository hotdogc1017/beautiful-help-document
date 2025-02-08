<script setup lang="ts">
import type { CoreTool, StreamTextResult } from 'ai'
import useHTMLtoMarkdown, { extractHTMLBody, extractMarkdownContent } from '@/hooks/useHTMLtoMarkdown'
import FileUpload, { type FileUploadSelectEvent } from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import { ref } from 'vue'
import { extractContent, MarkdownRender } from './markdownRender'

type FetchStatus = 'connect' | 'pending' | 'start' | 'running' | 'finish' | 'disconnect'

const fetchStatusMapping: Record<FetchStatus, string> = {
  connect: '连接到代理服务器',
  pending: '等待代理服务器',
  start: '代理服务器已准备响应',
  running: '代理服务器正在输出文本',
  finish: '代理服务器已输出所有文本',
  disconnect: '已断开代理服务器',
}

const { convertToMarkdown } = useHTMLtoMarkdown({ apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY })

const inputValue = ref()
const text = ref('')
const stop = ref(false)
const status = ref<FetchStatus | null>()
const loading = ref(false)

async function fetchTargetHTML() {
  stop.value = false
  const eventSource = new EventSource(`http://localhost:8000/man/command?name=${inputValue.value}`)

  const setStatus = (fetchStatus: FetchStatus) => {
    return () => {
      status.value = fetchStatus
    }
  }

  eventSource.addEventListener('text-delta', (event) => {
    if (stop.value) {
      eventSource.close()
    }

    setStatus('running')()
    const partTextJSON = event?.data
    if (!partTextJSON) {
      return
    }
    text.value = extractContent(text.value + (JSON.parse(partTextJSON)?.data ?? ''))
  })

  // eventSource.addEventListener('end', (event) => {
  //   const finalText = event?.data
  //   text.value = extractContent(JSON.parse(finalText)?.data)
  //   console.log(text.value)
  // })

  eventSource.addEventListener('open', setStatus('connect'))
  eventSource.addEventListener('start', setStatus('start'))
  eventSource.addEventListener('finish', setStatus('finish'))
}

async function appendText(response: StreamTextResult<Record<string, CoreTool>, any>) {
  const { textStream } = response
  for await (const textPart of textStream) {
    text.value = extractMarkdownContent(text.value + textPart)
  }
}

async function onSubmitted() {
  loading.value = true
  loading.value = true
  convertToMarkdown(inputValue.value).then(appendText).catch((e) => {
    console.error(e)
  }).finally(() => {
    loading.value = false
  })
}

async function onSelect(event: FileUploadSelectEvent) {
  const file = event.files[0] as File
  const content = extractHTMLBody(await file.text())
  console.log(`${Math.round(content.length / 1000)}K`)
  // console.log(content)
  // loading.value = true
  // convertToMarkdown(file).then(appendText).catch((e) => {
  //   console.error(e)
  // }).finally(() => {
  //   loading.value = false
  // })
}
</script>

<template>
  <form v-if="!text" @submit.prevent="onSubmitted">
    <label style="display: inline-grid;grid-template-columns: 1fr;">
      <InputText v-model="inputValue" placeholder="输入内容" />
    </label>

    <FileUpload
      mode="basic"
      accept="text/html"
      choose-label="Browse"
      @select="onSelect"
    />

    <ProgressSpinner v-if="loading" />

    <!-- <button type="button" @click="stop = true">
      Stop
    </button> -->
  </form>

  <MarkdownRender v-else :text="text" />
</template>

<style scoped>
:global(#app) {
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
}
</style>
