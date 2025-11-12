// 测试脚本：生成大量日志数据
const { app, BrowserWindow } = require('electron');
const path = require('path');

// 模拟发送大量日志数据
function generateLogs() {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    // 生成1000条日志
    for (let i = 0; i < 1000; i++) {
      setTimeout(() => {
        mainWindow.webContents.send('new-log-entry', {
          id: Date.now() + Math.random(),
          type: i % 3 === 0 ? 'info' : i % 3 === 1 ? 'success' : 'error',
          message: `测试日志条目 ${i + 1}: 这是一条测试消息，用于验证虚拟滚动功能是否正常工作。`,
          timestamp: new Date().toISOString(),
        });
      }, i * 10); // 每10毫秒发送一条日志
    }
  }
}

// 在应用准备好后生成日志
app.whenReady().then(() => {
  setTimeout(generateLogs, 5000); // 等待5秒后开始生成日志
});