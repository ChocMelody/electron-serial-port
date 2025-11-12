import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// 定义前后端通信的 API
contextBridge.exposeInMainWorld('api', {
  // 获取串口列表
  getPorts: () => ipcRenderer.invoke('get-ports'),
  
  // 获取配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // 保存配置
  setConfig: (config: object) => ipcRenderer.invoke('set-config', config),
  
  // 连接串口
  connect: () => ipcRenderer.invoke('connect'),
  
  // 断开连接
  disconnect: () => ipcRenderer.invoke('disconnect'),
  
  // 监听串口状态更新
  onSerialStatusUpdate: (callback: (status: string) => void) => {
    const subscription = (_event: IpcRendererEvent, status: string) => callback(status)
    ipcRenderer.on('serial-status-update', subscription)
    return () => ipcRenderer.removeListener('serial-status-update', subscription)
  },
  
  // 监听新日志条目
  onNewLogEntry: (callback: (entry: any) => void) => {
    const subscription = (_event: IpcRendererEvent, entry: any) => callback(entry)
    ipcRenderer.on('new-log-entry', subscription)
    return () => ipcRenderer.removeListener('new-log-entry', subscription)
  },
  
  // 移除所有监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})