import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Attachment {
  type: 'image' | 'file'
  name: string
  url: string
  size?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  timestamp: number
  typing?: boolean
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  messages: Message[]
}

export const useAssistantStore = defineStore('assistant', () => {
  const conversations = ref<Conversation[]>([])
  const currentId = ref<string | null>(null)

  const currentConversation = computed(() =>
    conversations.value.find(c => c.id === currentId.value) || null
  )

  const currentMessages = computed(() =>
    currentConversation.value?.messages || []
  )

  const create = () => {
    const id = Date.now().toString(36)
    conversations.value.unshift({ id, title: '新对话', createdAt: Date.now(), messages: [] })
    currentId.value = id
    return id
  }

  const del = (id: string) => {
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (currentId.value === id) {
      currentId.value = conversations.value[0]?.id || null
    }
  }

  const rename = (id: string, title: string) => {
    const conv = conversations.value.find(c => c.id === id)
    if (conv) conv.title = title
  }

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    if (!currentId.value) create()
    const conv = conversations.value.find(c => c.id === currentId.value)
    if (!conv) return
    const message: Message = { ...msg, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), timestamp: Date.now() }
    conv.messages.push(message)
    if (conv.messages.filter(m => m.role === 'user').length === 1 && msg.role === 'user') {
      conv.title = msg.content.slice(0, 20) || '新对话'
    }
    return message
  }

  const removeMessage = (msgId: string) => {
    const conv = conversations.value.find(c => c.id === currentId.value)
    if (conv) conv.messages = conv.messages.filter(m => m.id !== msgId)
  }

  return { conversations, currentId, currentConversation, currentMessages, create, del, rename, addMessage, removeMessage }
})
