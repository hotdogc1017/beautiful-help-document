<script setup lang="ts">
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

const inputValue = ref()
const text = ref('')
const stop = ref(false)
const status = ref<FetchStatus | null>()

async function generateHTML() {

}

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
</script>

<template>
  <form @submit.prevent="fetchTargetHTML">
    <label style="display: inline-grid;grid-template-columns: 1fr;">
      <input v-model="inputValue" placeholder="输入命令">
      <small v-if="status">{{ fetchStatusMapping[status] }}</small>
    </label>

    <button type="button" @click="stop = true">
      Stop
    </button>
    <button type="button" @click="generateHTML">
      Print
    </button>
    <MarkdownRender :text="text" />
  </form>
</template>

<style scoped>
html {
  display: flex;
  justify-content: center;
  align-items: center;
}

input {
  box-sizing: border-box;
  padding: 0.5rem;
  border: 1px solid rosybrown;
  border-radius: 0.5rem;
}

input:focus {
  border: 2px solid rosybrown;
}
</style>
