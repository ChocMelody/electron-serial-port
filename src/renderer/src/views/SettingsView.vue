<template>
  <div class="settings-view">
    <h2>配置中心</h2>
    
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>串口配置</span>
        </div>
      </template>
      
      <el-form :model="serialConfig" label-width="100px" label-position="left">
        <el-form-item label="端口">
          <el-select v-model="serialConfig.port" placeholder="请选择端口" style="width: 100%">
            <el-option
              v-for="port in availablePorts"
              :key="port.path"
              :label="port.path"
              :value="port.path"
            />
          </el-select>
          <el-button @click="refreshPorts" style="margin-left: 10px">刷新</el-button>
        </el-form-item>
        
        <el-form-item label="波特率">
          <el-select v-model="serialConfig.baudRate" placeholder="请选择波特率" style="width: 100%">
            <el-option
              v-for="rate in baudRates"
              :key="rate"
              :label="rate"
              :value="rate"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="数据位">
          <el-select v-model="serialConfig.dataBits" placeholder="请选择数据位" style="width: 100%">
            <el-option
              v-for="bits in dataBitsOptions"
              :key="bits"
              :label="bits"
              :value="bits"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="停止位">
          <el-select v-model="serialConfig.stopBits" placeholder="请选择停止位" style="width: 100%">
            <el-option
              v-for="bits in stopBitsOptions"
              :key="bits"
              :label="bits"
              :value="bits"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="校验位">
          <el-select v-model="serialConfig.parity" placeholder="请选择校验位" style="width: 100%">
            <el-option
              v-for="parity in parityOptions"
              :key="parity.value"
              :label="parity.label"
              :value="parity.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card class="config-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>HTTP 接口配置</span>
        </div>
      </template>
      
      <el-form :model="httpConfig" label-width="100px" label-position="left">
        <el-form-item label="接口地址">
          <el-input v-model="httpConfig.url" placeholder="请输入完整的 HTTP POST 地址"></el-input>
        </el-form-item>
      </el-form>
    </el-card>
    
    <div class="actions">
      <el-button type="primary" @click="saveConfig">保存配置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '../stores/config'
import type { SerialPortInfo, AppConfig, SerialConfig, HttpConfig } from '../types/electron-api'

const configStore = useConfigStore()

// 串口配置
const serialConfig = ref<SerialConfig>({
  port: '',
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
})

// HTTP 配置
const httpConfig = ref<HttpConfig>({
  url: 'http://example.com/api/v1/data'
})

// 可用端口列表
const availablePorts = ref<SerialPortInfo[]>([])

// 波特率选项
const baudRates = [9600, 115200, 19200, 38400, 57600, 14400, 28800, 76800, 230400]

// 数据位选项
const dataBitsOptions = [8, 7, 6, 5]

// 停止位选项
const stopBitsOptions = [1, 2]

// 校验位选项
const parityOptions = [
  { label: '无', value: 'none' },
  { label: '偶校验', value: 'even' },
  { label: '奇校验', value: 'odd' },
  { label: '标记', value: 'mark' },
  { label: '空格', value: 'space' }
]

// 刷新端口列表
const refreshPorts = async () => {
  try {
    availablePorts.value = await window.api.getPorts()
    ElMessage.success('端口列表刷新成功')
  } catch (error: any) {
    ElMessage.error('刷新端口列表失败: ' + error.message)
  }
}

// 保存配置
const saveConfig = async () => {
  try {
    console.log('保存配置:', serialConfig.value, httpConfig.value);
    
    // 将响应式对象转换为普通对象，避免 Electron IPC 传递 Proxy 对象
    const configToSave = {
      serial: {
        port: serialConfig.value.port,
        baudRate: serialConfig.value.baudRate,
        dataBits: serialConfig.value.dataBits,
        stopBits: serialConfig.value.stopBits,
        parity: serialConfig.value.parity
      },
      http: {
        url: httpConfig.value.url
      }
    };
    
    await window.api.setConfig(configToSave)
    ElMessage.success('配置保存成功')
  } catch (error: any) {
    console.error('保存配置失败:', error);
    ElMessage.error('保存配置失败: ' + error.message)
  }
}

// 组件挂载时加载配置
onMounted(async () => {
  try {
    // 获取端口列表
    availablePorts.value = await window.api.getPorts()
    
    // 获取当前配置
    const config: AppConfig = await window.api.getConfig()
    if (config.serial) {
      serialConfig.value = config.serial
    }
    if (config.http) {
      httpConfig.value = config.http
    }
  } catch (error: any) {
    ElMessage.error('加载配置失败: ' + error.message)
  }
})
</script>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  font-weight: bold;
}

.actions {
  text-align: center;
  margin-top: 30px;
}
</style>