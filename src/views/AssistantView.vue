<template>
  <div class="flex h-full gap-4">
    <!-- 对话列表 -->
    <div v-show="showSidebar" class="w-64 flex flex-col bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
      <div class="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
        <span class="text-sm font-semibold">对话记录</span>
        <div class="flex items-center gap-1">
          <button class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--accent))] transition-colors" @click="newChat">
            <Icon icon="mdi:plus" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
          <button class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--accent))] transition-colors" @click="showSidebar = false">
            <Icon icon="mdi:chevron-left" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="c in store.conversations"
          :key="c.id"
          :class="['flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group', store.currentId === c.id ? 'bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)]' : 'hover:bg-[hsl(var(--accent))] border border-transparent']"
          @click="store.currentId = c.id"
        >
          <div class="w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center flex-shrink-0">
            <Icon icon="mdi:chat-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ c.title }}</div>
            <div class="text-xs text-[hsl(var(--muted-foreground))]">{{ formatDate(c.createdAt) }}</div>
          </div>
          <el-dropdown trigger="click" @command="(cmd: string) => handleConvAction(cmd, c.id)">
            <button class="p-1 rounded hover:bg-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
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
        <div v-if="store.conversations.length === 0" class="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
          <Icon icon="mdi:chat-plus-outline" class="w-10 h-10 mb-3 opacity-30" />
          <span class="text-xs">点击 + 开始新对话</span>
        </div>
      </div>
    </div>

    <!-- 聊天区 -->
    <div class="flex-1 flex flex-col bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
      <!-- 顶部标题 -->
      <div class="flex items-center px-5 py-3 border-b border-[hsl(var(--border))]">
        <button v-if="!showSidebar" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--accent))] transition-colors mr-2" @click="showSidebar = true">
          <Icon icon="mdi:menu" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </button>
        <div class="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center mr-3">
          <Icon icon="mdi:robot-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <div class="text-sm font-semibold">MobTestLab 助手</div>
          <div class="text-xs text-[hsl(var(--muted-foreground))]">AI 测试助手</div>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="msgContainer" class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div v-if="store.currentMessages.length === 0" class="flex flex-col items-center justify-center h-full text-[hsl(var(--muted-foreground))]">
          <div class="w-16 h-16 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4">
            <Icon icon="mdi:robot-happy-outline" class="w-8 h-8 text-[hsl(var(--primary)/0.5)]" />
          </div>
          <p class="text-sm font-medium">你好！我是 MobTestLab 助手</p>
          <p class="text-xs mt-1 opacity-70">有什么可以帮助你的？</p>
        </div>

        <div v-for="msg in store.currentMessages" :key="msg.id" :class="['flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '']">
          <!-- 头像 -->
          <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', msg.role === 'user' ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--secondary))]']">
            <Icon :icon="msg.role === 'user' ? 'mdi:account' : 'mdi:robot-outline'" :class="['w-4 h-4', msg.role === 'user' ? 'text-white' : 'text-[hsl(var(--primary))]']" />
          </div>
          <!-- 消息气泡 -->
          <div :class="['max-w-[65%]', msg.role === 'user' ? 'items-end' : 'items-start']">
            <div :class="['rounded-2xl px-4 py-3', msg.role === 'user' ? 'bg-[hsl(var(--primary))] text-white rounded-tr-sm' : 'bg-[hsl(var(--secondary))] rounded-tl-sm']">
              <div v-if="msg.typing" class="flex gap-1.5 py-1 px-1">
                <span class="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce"></span>
                <span class="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0.15s]"></span>
                <span class="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0.3s]"></span>
              </div>
              <template v-else>
                <p class="text-sm whitespace-pre-wrap break-words leading-relaxed">{{ msg.content }}</p>
                <div v-if="msg.attachments?.length" class="mt-2 space-y-1.5">
                  <div v-for="(att, i) in msg.attachments" :key="i">
                    <img v-if="att.type === 'image'" :src="att.url" class="max-w-[200px] max-h-[150px] rounded-lg cursor-pointer" @click="previewImage = att.url; showPreview = true" />
                    <div v-else class="flex items-center gap-2 p-2 rounded-lg border border-white/20">
                      <Icon icon="mdi:file-outline" class="w-4 h-4" />
                      <span class="text-xs truncate">{{ att.name }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <div class="text-[10px] mt-1 px-1" :class="msg.role === 'user' ? 'text-right text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--muted-foreground))]'">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="border-t border-[hsl(var(--border))] p-4">
        <div v-if="attachments.length" class="flex flex-wrap gap-2 mb-3">
          <div v-for="(att, i) in attachments" :key="i" class="relative group">
            <img v-if="att.type === 'image'" :src="att.url" class="w-14 h-14 rounded-lg object-cover border border-[hsl(var(--border))]" />
            <div v-else class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs bg-[hsl(var(--secondary))]">
              <Icon icon="mdi:file-outline" class="w-3.5 h-3.5" />
              <span class="max-w-[80px] truncate">{{ att.name }}</span>
            </div>
            <button class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[hsl(var(--destructive))] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" @click="attachments.splice(i, 1)">
              <Icon icon="mdi:close" class="w-3 h-3" />
            </button>
          </div>
        </div>
        <div class="flex items-end gap-2">
          <el-popover placement="top-start" :width="120" trigger="click">
            <template #reference>
              <button class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--accent))] transition-colors flex-shrink-0">
                <Icon icon="mdi:plus" class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </template>
            <div class="flex flex-col gap-1 -m-1">
              <button class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[hsl(var(--accent))] transition-colors w-full text-left" @click="pickImage">
                <Icon icon="mdi:image-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>图片</span>
              </button>
              <button class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[hsl(var(--accent))] transition-colors w-full text-left" @click="pickFile">
                <Icon icon="mdi:file-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>文件</span>
              </button>
            </div>
          </el-popover>
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="flex-1 resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.1)] max-h-[120px] transition-all"
            rows="1"
            placeholder="输入消息..."
            @keydown="handleKeydown"
            @input="autoGrow"
          ></textarea>
          <button class="w-9 h-9 rounded-xl bg-[hsl(var(--primary))] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0" :disabled="!inputText.trim() && !attachments.length" @click="send">
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
const showSidebar = ref(true)

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

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${formatTime(ts)}`
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
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

const autoGrow = () => {
  const el = inputRef.value
  if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
}

const pickImage = () => imageInput.value?.click()
const pickFile = () => fileInput.value?.click()

const onImagePicked = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) attachments.value.push({ type: 'image', name: file.name, url: URL.createObjectURL(file) })
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

if (!store.currentId && store.conversations.length === 0) store.create()
</script>
