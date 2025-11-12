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
          <el-button @click="clearLogs" size="small">清空日志</el-button>
        </div>
      </template>

      <div class="logs-container">
        <DynamicScroller ref="virtualListRef" :items="reversedLogs" :min-item-size="30" key-field="id" PageMode>
          <template #default="{ item, index, active }">
            <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[item.message]" :data-index="index">
              <div :class="['log-entry', item.type]">
                <span class="timestamp">[{{ formatTime(item.timestamp) }}]</span>
                <span class="type">[{{ item.type.toUpperCase() }}]</span>
                <span class="message">{{ item.message }}</span>
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
import { useConfigStore } from '../stores/config'
import type { AppConfig, HttpConfig, LogEntry } from '../types/electron-api'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

const configStore = useConfigStore()

// 串口状态
const serialStatus = ref({
  text: '未连接',
  type: 'info'
})

// HTTP URL
const httpUrl = ref('')

// 是否已连接
const isConnected = ref(false)

// 日志列表
const logs = ref<LogEntry[]>([])

// 最大日志条目数
const MAX_LOG_ENTRIES = 1000

// 虚拟列表引用
const virtualListRef = ref<InstanceType<typeof DynamicScroller> | null>(null)

// 计算属性：反转日志顺序，使最新日志显示在最上方
const reversedLogs = computed(() => {
  return [...logs.value].reverse()
})

// 格式化时间
const formatTime = (timestamp: Date) => {
  return timestamp.toISOString().slice(0, 19).replace('T', ' ')
}

// 更新串口状态显示
const updateSerialStatus = (status: string) => {
  switch (status) {
    case 'connected':
      serialStatus.value = { text: '已连接', type: 'success' }
      isConnected.value = true
      addLog('success', '串口连接成功')
      break
    case 'disconnected':
      serialStatus.value = { text: '未连接', type: 'info' }
      isConnected.value = false
      addLog('info', '串口连接已断开')
      break
    case 'error':
      serialStatus.value = { text: '连接错误', type: 'danger' }
      isConnected.value = false
      break
    default:
      serialStatus.value = { text: status, type: 'info' }
  }
}

// 添加日志条目
const addLog = (type: string, message: string) => {
  const entry: LogEntry = {
    id: Date.now() + Math.random(), // 添加唯一ID用于虚拟滚动
    type,
    message,
    timestamp: new Date()
  }

  logs.value.push(entry)

  // 如果日志条目超过最大数量，删除最旧的条目
  if (logs.value.length > MAX_LOG_ENTRIES) {
    logs.value.splice(0, logs.value.length - MAX_LOG_ENTRIES)
  }

  // 自动滚动到顶部以显示最新的日志条目
  nextTick(() => {
    if (virtualListRef.value) {
      // 滚动到第一项（因为列表已经反转，第一项就是最新的日志）
      virtualListRef.value.scrollToItem(0)
    }
  })
}

// 切换连接状态
const toggleConnection = async () => {
  try {
    if (isConnected.value) {
      await window.api.disconnect()
    } else {
      const result = await window.api.connect()
      console.log('connect result:', result);

      if (!result) {
        ElMessage.error('连接失败')
        return
      }
    }
  } catch (error: any) {
    ElMessage.error((isConnected.value ? '断开' : '连接') + '操作失败: ' + error.message)
  }
}

// 清空日志
const clearLogs = () => {
  logs.value = []
}

// 组件挂载时初始化
onMounted(async () => {
  // 获取当前配置
  try {
    const config: AppConfig = await window.api.getConfig()
    if (config.http) {
      httpUrl.value = config.http.url
    }
  } catch (error: any) {
    ElMessage.error('获取配置失败: ' + error.message)
  }

  // 监听串口状态更新
  window.api.onSerialStatusUpdate((status: string) => {
    updateSerialStatus(status)
  })

  // 监听新日志条目
  window.api.onNewLogEntry((entry: LogEntry) => {
    addLog(entry.type, entry.message)
  })
})

// 组件卸载时清理监听器
onUnmounted(() => {
  window.api.removeAllListeners('serial-status-update')
  window.api.removeAllListeners('new-log-entry')
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
</style>