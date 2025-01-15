<script setup lang="ts">
import { ref } from 'vue'
import RenderMarkdown from './RenderMarkdown.vue'

const inputValue = ref()
const text = ref()
const stop = ref(false)

async function fetchTargetHTML() {
  stop.value = false
  const eventSource = new EventSource(`http://localhost:8000/man/command?name=${inputValue.value}`)

  eventSource.addEventListener('message', (event) => {
    if (stop.value) {
      eventSource.close()
    }
    text.value = JSON.parse(event.data).data ?? ''
  })

  eventSource.addEventListener('finished', (event) => {
    console.log(`ok`, event.data)
  })
}
</script>

<template>
  <form @submit.prevent="fetchTargetHTML">
    <input v-model="inputValue" placeholder="输入命令">
    <button type="button" @click="stop = true">
      Stop
    </button>
    <RenderMarkdown :text="text" />
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
