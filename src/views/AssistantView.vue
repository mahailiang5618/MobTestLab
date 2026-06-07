<template>
  <div class="flex h-full gap-4">
    <!-- 对话列表 -->
    <div class="w-56 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
      <div class="flex items-center justify-between p-3 border-b border-[hsl(var(--border))]">
        <span class="text-sm font-medium">对话记录</span>
        <button class="p-1 rounded hover:bg-[hsl(var(--accent))]" @click="newChat">
          <Icon icon="mdi:plus" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="c in store.conversations"
          :key="c.id"
          :class="['flex items-center gap-2 p-2 rounded cursor-pointer text-sm group', store.currentId === c.id ? 'bg-[hsl(var(--primary)/0.15)]' : 'hover:bg-[hsl(var(--accent))]']"
          @click="store.currentId = c.id"
        >
          <Icon icon="mdi:chat-outline" class="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
          <span class="flex-1 truncate">{{ c.title }}</span>
          <el-dropdown trigger="click" @command="(cmd: string) => handleConvAction(cmd, c.id)">
            <button class="p-0.5 rounded hover:bg-[hsl(var(--accent))] opacity-0 group-hover:opacity-100" @click.stop>
              <Icon icon="mdi:dots-vertical" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename"><Icon icon="mdi:pencil" class="w-3.5 h-3.5 mr-2" />重命名</el-dropdown-item>
                <el-dropdown-item command="delete" divided><Icon icon="mdi:delete" class="w-3.5 h-3.5 mr-2 text-[hsl(var(--destructive))]" />删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-if="store.conversations.length === 0" class="text-xs text-center text-[hsl(var(--muted-foreground))] py-4">
          暂无对话，点击 + 开始
        </div>
      </div>
    </div>

    <!-- 聊天区 -->
    <div class="flex-1 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      <!-- 消息列表 -->
      <div ref="msgContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="store.currentMessages.length === 0" class="flex flex-col items-center justify-center h-full text-[hsl(var(--muted-foreground))]">
          <Icon icon="mdi:chat-outline" class="w-12 h-12 mb-3 opacity-30" />
          <p class="text-sm">开始新的对话</p>
        </div>
        <div v-for="msg in store.currentMessages" :key="msg.id" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div :class="['max-w-[70%] rounded-lg px-3 py-2', msg.role === 'user' ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--secondary))]']">
            <div v-if="msg.typing" class="flex gap-1 py-1">
              <span class="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce"></span>
              <span class="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0.15s]"></span>
              <span class="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0.3s]"></span>
            </div>
            <template v-else>
              <p class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</p>
              <div v-if="msg.attachments?.length" class="mt-2 space-y-1">
                <div v-for="(att, i) in msg.attachments" :key="i">
                  <img v-if="att.type === 'image'" :src="att.url" class="max-w-[200px] max-h-[150px] rounded cursor-pointer" @click="previewImage = att.url; showPreview = true" />
                  <div v-else class="flex items-center gap-2 p-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                    <Icon icon="mdi:file-outline" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span class="text-xs truncate">{{ att.name }}</span>
                    <span v-if="att.size" class="text-[10px] text-[hsl(var(--muted-foreground))]">{{ att.size }}</span>
                  </div>
                </div>
              </div>
            </template>
            <div class="text-[10px] mt-1" :class="msg.role === 'user' ? 'text-white/60' : 'text-[hsl(var(--muted-foreground))]'">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="border-t border-[hsl(var(--border))] p-3">
        <div v-if="attachments.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="(att, i) in attachments" :key="i" class="relative group">
            <img v-if="att.type === 'image'" :src="att.url" class="w-14 h-14 rounded object-cover border border-[hsl(var(--border))]" />
            <div v-else class="flex items-center gap-1 px-2 py-1 rounded border border-[hsl(var(--border))] text-xs">
              <Icon icon="mdi:file-outline" class="w-3.5 h-3.5" />
              <span class="max-w-[80px] truncate">{{ att.name }}</span>
            </div>
            <button class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[hsl(var(--destructive))] text-white flex items-center justify-center opacity-0 group-hover:opacity-100" @click="attachments.splice(i, 1)">
              <Icon icon="mdi:close" class="w-3 h-3" />
            </button>
          </div>
        </div>
        <div class="flex items-end gap-2">
          <div class="flex gap-1">
            <button class="p-1.5 rounded hover:bg-[hsl(var(--accent))]" @click="pickImage">
              <Icon icon="mdi:image-outline" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
            <button class="p-1.5 rounded hover:bg-[hsl(var(--accent))]" @click="pickFile">
              <Icon icon="mdi:attachment" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="flex-1 resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))] max-h-[120px]"
            rows="1"
            placeholder="输入消息..."
            @keydown="handleKeydown"
            @input="autoGrow"
          ></textarea>
          <button class="p-2 rounded-lg bg-[hsl(var(--primary))] text-white hover:opacity-90 disabled:opacity-40" :disabled="!inputText.trim() && !attachments.length" @click="send">
            <Icon icon="mdi:send" class="w-4 h-4" />
          </button>
        </div>
      </div>
      <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="onImagePicked" />
      <input ref="fileInput" type="file" class="hidden" @change="onFilePicked" />
    </div>

    <!-- 图片预览 -->
    <el-dialog v-model="showPreview" title="图片预览" width="auto" destroy-on-close @close="previewImage = ''">
      <img :src="previewImage" class="max-w-full max-h-[70vh]" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessageBox } from 'element-plus'
import { useAssistantStore, type Attachment } from '@/stores/assistant'

const store = useAssistantStore()

const msgContainer = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()
const imageInput = ref<HTMLInputElement>()
const fileInput = ref<HTMLInputElement>()
const inputText = ref('')
const attachments = ref<Attachment[]>([])
const previewImage = ref('')
const showPreview = ref(false)

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const scrollToBottom = () => {
  nextTick(() => { if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight })
}

const newChat = () => {
  store.create()
  nextTick(() => inputRef.value?.focus())
}

const handleConvAction = async (cmd: string, id: string) => {
  if (cmd === 'delete') {
    store.del(id)
  } else if (cmd === 'rename') {
    const { value } = await ElMessageBox.prompt('输入新名称', '重命名', { inputValue: store.conversations.find(c => c.id === id)?.title })
    if (value?.trim()) store.rename(id, value.trim())
  }
}

const send = () => {
  const content = inputText.value.trim()
  if (!content && !attachments.value.length) return
  if (!store.currentId) store.create()

  store.addMessage({ role: 'user', content, attachments: attachments.value.length ? [...attachments.value] : undefined })
  inputText.value = ''
  attachments.value = []
  if (inputRef.value) { inputRef.value.style.height = 'auto' }
  scrollToBottom()

  const typingMsg = store.addMessage({ role: 'assistant', content: '', typing: true })
  scrollToBottom()

  setTimeout(() => {
    if (typingMsg) {
      store.removeMessage(typingMsg.id)
      store.addMessage({ role: 'assistant', content: '你好！我是 MobTestLab 助手，该功能正在开发中，敬请期待。' })
      scrollToBottom()
    }
  }, 1500)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

const autoGrow = () => {
  const el = inputRef.value
  if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
}

const pickImage = () => imageInput.value?.click()
const pickFile = () => fileInput.value?.click()

const onImagePicked = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    attachments.value.push({ type: 'image', name: file.name, url: URL.createObjectURL(file) })
  }
  if (imageInput.value) imageInput.value.value = ''
}

const onFilePicked = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const size = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`
    attachments.value.push({ type: 'file', name: file.name, url: URL.createObjectURL(file), size })
  }
  if (fileInput.value) fileInput.value.value = ''
}

if (!store.currentId && store.conversations.length === 0) {
  store.create()
}
</script>
