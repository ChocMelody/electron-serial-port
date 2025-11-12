<template>
  <div class="logs-view">
    <h2>运行日志</h2>

    <el-card class="status-card">
      <template #header>
        <div class="card-header">
          <span>状态信息</span>
        </div>
      </template>

      <div class="status-info">
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="status-item">
              <span class="label">串口状态:</span>
              <el-tag :type="serialStatus.type">{{ serialStatus.text }}</el-tag>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="status-item">
              <span class="label">HTTP 接口:</span>
              <span>{{ httpUrl || '未配置' }}</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="actions">
        <el-button :type="isConnected ? 'danger' : 'primary'" @click="toggleConnection">
          {{ isConnected ? '断开' : '连接' }}
        </el-button>
      </div>
    </el-card>

    <el-card class="logs-card">
      <template #header>
        <div class="card-header">
          <span>日志窗口</span>
          <div class="log-controls">
            <el-button-group size="small">
              <el-button :type="activeLogTab === 'serial' ? 'primary' : 'default'" @click="switchLogTab('serial')">
                串口日志
              </el-button>
              <el-button :type="activeLogTab === 'http' ? 'primary' : 'default'" @click="switchLogTab('http')">
                上传接口日志
              </el-button>
            </el-button-group>
            <el-button @click="clearLogs" size="small">清空当前日志</el-button>
          </div>
        </div>
      </template>

      <div v-if="activeLogTab === 'serial'" class="logs-container">
        <DynamicScroller
          ref="serialListRef"
          :items="reversedSerialLogs"
          :min-item-size="30"
          key-field="id"
          PageMode
        >
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.message]"
              :data-index="index"
            >
              <div :class="['log-entry', item.type]">
                <span class="timestamp">[{{ formatTime(item.timestamp) }}]</span>
                <span class="type">[{{ item.type.toUpperCase() }}]</span>
                <span class="message">{{ item.message }}</span>
              </div>
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
      </div>

      <div v-else class="logs-container http-logs-container">
        <DynamicScroller
          ref="httpListRef"
          :items="reversedHttpLogs"
          :min-item-size="60"
          key-field="id"
          PageMode
        >
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.message, item.responseText]"
              :data-index="index"
            >
              <div :class="['http-log-entry', item.code === 200 ? 'success' : 'error']">
                <div class="http-log-meta">
                  <span class="timestamp">[{{ formatTime(item.timestamp) }}]</span>
                  <span class="http-code">code: {{ item.code }}</span>
                </div>
                <div class="http-log-message">{{ item.message }}</div>
                <div v-if="item.error && item.code !== 200" class="http-log-error">错误: {{ item.error }}</div>
                <pre v-if="item.responseText" class="http-log-response">{{ item.responseText }}</pre>
              </div>
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { AppConfig, LogEntry, HttpLogEntry } from '../types/electron-api'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

const serialStatus = ref({
  text: '未连接',
  type: 'info'
})

const httpUrl = ref('')
const isConnected = ref(false)

const serialLogs = ref<LogEntry[]>([])
type HttpLogViewEntry = HttpLogEntry & { responseText: string }
const httpLogs = ref<HttpLogViewEntry[]>([])

const MAX_SERIAL_LOG_ENTRIES = 1000
const MAX_HTTP_LOG_ENTRIES = 1000

const serialListRef = ref<InstanceType<typeof DynamicScroller> | null>(null)
const httpListRef = ref<InstanceType<typeof DynamicScroller> | null>(null)

const activeLogTab = ref<'serial' | 'http'>('serial')

const reversedSerialLogs = computed(() => {
  return [...serialLogs.value].reverse()
})

const reversedHttpLogs = computed(() => {
  return [...httpLogs.value].reverse()
})

const normalizeTimestamp = (value?: Date | string) => {
  if (!value) {
    return new Date()
  }
  if (value instanceof Date) {
    return value
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const formatTime = (value: Date | string) => {
  const date = normalizeTimestamp(value)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

const focusLatest = (tab: 'serial' | 'http') => {
  nextTick(() => {
    if (tab === 'serial') {
      serialListRef.value?.scrollToItem(0)
    } else {
      httpListRef.value?.scrollToItem(0)
    }
  })
}

const appendSerialLog = (type: string, message: string, timestamp?: Date | string, id?: number | string) => {
  const entry: LogEntry = {
    id: id ?? Date.now() + Math.random(),
    type,
    message,
    timestamp: normalizeTimestamp(timestamp)
  }

  serialLogs.value.push(entry)

  if (serialLogs.value.length > MAX_SERIAL_LOG_ENTRIES) {
    serialLogs.value.splice(0, serialLogs.value.length - MAX_SERIAL_LOG_ENTRIES)
  }

  if (activeLogTab.value === 'serial') {
    focusLatest('serial')
  }
}

const buildResponseText = (payload: any) => {
  if (payload === undefined || payload === null) {
    return '无返回数据'
  }

  if (typeof payload === 'string') {
    return payload
  }

  try {
    return JSON.stringify(payload, null, 2)
  } catch (error) {
    return String(payload)
  }
}

const appendHttpLog = (entry: HttpLogEntry) => {
  const normalizedEntry: HttpLogViewEntry = {
    ...entry,
    id: entry.id ?? Date.now() + Math.random(),
    timestamp: normalizeTimestamp(entry.timestamp),
    responseText: buildResponseText(entry.response)
  }

  httpLogs.value.push(normalizedEntry)

  if (httpLogs.value.length > MAX_HTTP_LOG_ENTRIES) {
    httpLogs.value.splice(0, httpLogs.value.length - MAX_HTTP_LOG_ENTRIES)
  }

  if (activeLogTab.value === 'http') {
    focusLatest('http')
  }
}

const switchLogTab = (tab: 'serial' | 'http') => {
  if (activeLogTab.value === tab) {
    return
  }
  activeLogTab.value = tab
  focusLatest(tab)
}

const updateSerialStatus = (status: string) => {
  switch (status) {
    case 'connected':
      serialStatus.value = { text: '已连接', type: 'success' }
      isConnected.value = true
      appendSerialLog('success', '串口连接成功')
      break
    case 'disconnected':
      serialStatus.value = { text: '未连接', type: 'info' }
      isConnected.value = false
      appendSerialLog('info', '串口连接已断开')
      break
    case 'error':
      serialStatus.value = { text: '连接错误', type: 'danger' }
      isConnected.value = false
      appendSerialLog('error', '串口连接异常')
      break
    default:
      serialStatus.value = { text: status, type: 'info' }
  }
}

const toggleConnection = async () => {
  try {
    if (isConnected.value) {
      await window.api.disconnect()
    } else {
      const result = await window.api.connect()
      console.log('connect result:', result)

      if (!result) {
        ElMessage.error('连接失败')
        return
      }
    }
  } catch (error: any) {
    ElMessage.error((isConnected.value ? '断开' : '连接') + '操作失败: ' + error.message)
  }
}

const clearLogs = () => {
  if (activeLogTab.value === 'serial') {
    serialLogs.value = []
    ElMessage.success('串口日志已清空')
  } else {
    httpLogs.value = []
    ElMessage.success('上传接口日志已清空')
  }
}

const disposers: Array<() => void> = []

onMounted(async () => {
  try {
    const config: AppConfig = await window.api.getConfig()
    if (config.http) {
      httpUrl.value = config.http.url
    }
  } catch (error: any) {
    ElMessage.error('获取配置失败: ' + error.message)
  }

  disposers.push(
    window.api.onSerialStatusUpdate((status: string) => {
      updateSerialStatus(status)
    })
  )

  disposers.push(
    window.api.onNewLogEntry((entry: LogEntry) => {
      appendSerialLog(entry.type, entry.message, entry.timestamp, entry.id)
    })
  )

  disposers.push(
    window.api.onHttpLogEntry((entry: HttpLogEntry) => {
      appendHttpLog(entry)
    })
  )
})

onUnmounted(() => {
  disposers.forEach((dispose) => dispose && dispose())
  window.api.removeAllListeners('serial-status-update')
  window.api.removeAllListeners('new-log-entry')
  window.api.removeAllListeners('http-log-entry')
})
</script>

<style scoped>
.logs-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.status-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  height: 100%;
}

.status-info {
  margin-bottom: 20px;
}

.status-item {
  margin-bottom: 10px;
}

.status-item .label {
  display: inline-block;
  width: 100px;
  font-weight: bold;
}

.logs-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logs-card :deep(.el-card__body) {
  height: 100%;
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logs-container {
  flex: 1;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fff;
  font-family: monospace;
  overflow-y: auto;
  height: 100%;
}

.log-entry {
  margin-bottom: 5px;
  line-height: 1.4;
  padding: 5px;
}

.log-entry .timestamp {
  color: #909399;
}

.log-entry .type {
  margin: 0 5px;
  font-weight: bold;
}

.log-entry.info .type {
  color: #409eff;
}

.log-entry.success .type {
  color: #67c23a;
}

.log-entry.error .type {
  color: #f56c6c;
}

.log-entry.data .type {
  color: #e6a23c;
}

.log-entry.http .type {
  color: #909399;
}

.actions {
  text-align: center;
}

.http-logs-container {
  font-family: monospace;
}

.http-log-entry {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #f5f7fa;
  line-height: 1.5;
}

.http-log-entry.success {
  border-color: #e1f3d8;
  background-color: #f0f9eb;
}

.http-log-entry.error {
  border-color: #fde2e2;
  background-color: #fef0f0;
}

.http-log-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 4px;
}

.http-log-message {
  margin-bottom: 4px;
  word-break: break-all;
}

.http-log-error {
  color: #f56c6c;
  margin-bottom: 4px;
  word-break: break-all;
}

.http-log-response {
  margin: 0;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
}
</style>