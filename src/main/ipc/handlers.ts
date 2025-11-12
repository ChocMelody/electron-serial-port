import { ipcMain } from 'electron';
import { nestApp } from '../main';
import { SerialPortService } from '../nestjs/services/serialport.service';
import { ConfigService, AppConfig } from '../nestjs/services/config.service';

let serialPortService: SerialPortService | null = null;
let configService: ConfigService | null = null;

// 初始化服务实例
export async function initializeIpcHandlers() {
  if (nestApp) {
    try {
      console.log('Attempting to get services from NestJS container...');
      serialPortService = nestApp.get(SerialPortService);
      configService = nestApp.get(ConfigService);
      
      // 验证服务是否正确获取
      console.log('SerialPortService instance:', serialPortService ? 'Available' : 'Undefined');
      console.log('ConfigService instance:', configService ? 'Available' : 'Undefined');
      
      if (!serialPortService) {
        console.error('Failed to get SerialPortService from NestJS container');
        return;
      }
      
      if (!configService) {
        console.error('Failed to get ConfigService from NestJS container');
        return;
      }
      
      console.log('IPC handlers initialized successfully');
      
      // 注册 IPC 处理程序
      registerIpcHandlers();
    } catch (error) {
      console.error('Error initializing IPC handlers:', error);
    }
  } else {
    console.error('NestJS application is not initialized');
  }
}

function registerIpcHandlers() {
  // 获取串口列表
  ipcMain.handle('get-ports', async () => {
    if (serialPortService) {
      return await serialPortService.listPorts();
    }
    return [];
  });

  // 获取配置
  ipcMain.handle('get-config', () => {
    if (configService) {
      return configService.getConfig();
    }
    return {};
  });

  // 保存配置
  ipcMain.handle('set-config', (_event, config: AppConfig) => {
    if (configService) {
      configService.setConfig(config);
      return true;
    }
    return false;
  });

  // 连接串口
  ipcMain.handle('connect', async () => {
    if (serialPortService) {
      try {
        return await serialPortService.connect();
      } catch (error) {
        console.error('Error in connect handler:', error);
        return false;
      }
    }
    console.error('SerialPortService is not initialized');
    return false;
  });

  // 断开连接
  ipcMain.handle('disconnect', async () => {
    if (serialPortService) {
      await serialPortService.disconnect();
      return true;
    }
    return false;
  });
}