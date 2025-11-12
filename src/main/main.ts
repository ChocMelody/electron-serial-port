import { app, BrowserWindow } from 'electron'
import path from 'path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './nestjs/app.module'
import { INestApplication } from '@nestjs/common'
import { initializeIpcHandlers } from './ipc/handlers'

// 添加热重载功能
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true,
      // 明确指定要监视的文件和目录
      ignore: [
        'node_modules',
        'dist',
        'release',
        '.git',
        '*.log'
      ]
    });
    console.log('[Hot Reload] Electron reloader initialized');
  } catch (error) {
    console.error('[Hot Reload] Failed to initialize electron-reloader:', error);
  }
}

let mainWindow: BrowserWindow | null = null
let nestApp: INestApplication | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.NODE_ENV === 'development') {
    // 在开发环境中使用 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function bootstrapNestJS() {
  try {
    nestApp = await NestFactory.createApplicationContext(AppModule) as any
    console.log('NestJS application initialized')
    return nestApp
  } catch (error: any) {
    console.error('Failed to initialize NestJS application:', error)
  }
}

app.whenReady().then(async () => {
  // Initialize NestJS application
  await bootstrapNestJS()
  
  // Initialize IPC handlers
  await initializeIpcHandlers()
  
  // Create Electron window
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (nestApp) {
    nestApp.close()
  }
})

export { mainWindow, nestApp }