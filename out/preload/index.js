"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  // 获取串口列表
  getPorts: () => electron.ipcRenderer.invoke("get-ports"),
  // 获取配置
  getConfig: () => electron.ipcRenderer.invoke("get-config"),
  // 保存配置
  setConfig: (config) => electron.ipcRenderer.invoke("set-config", config),
  // 连接串口
  connect: () => electron.ipcRenderer.invoke("connect"),
  // 断开连接
  disconnect: () => electron.ipcRenderer.invoke("disconnect"),
  // 监听串口状态更新
  onSerialStatusUpdate: (callback) => {
    const subscription = (_event, status) => callback(status);
    electron.ipcRenderer.on("serial-status-update", subscription);
    return () => electron.ipcRenderer.removeListener("serial-status-update", subscription);
  },
  // 监听新日志条目
  onNewLogEntry: (callback) => {
    const subscription = (_event, entry) => callback(entry);
    electron.ipcRenderer.on("new-log-entry", subscription);
    return () => electron.ipcRenderer.removeListener("new-log-entry", subscription);
  },
  // 移除所有监听器
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
