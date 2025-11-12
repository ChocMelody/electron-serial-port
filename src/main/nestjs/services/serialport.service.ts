import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SerialPort } from 'serialport';
import { ConfigService, SerialConfig } from './config.service';
import { HttpService } from './http.service';

// 动态导入 main 窗口
async function getMainWindow() {
  const { mainWindow } = await import('../../main');
  return mainWindow;
}

@Injectable()
export class SerialPortService {
  private serialPort: SerialPort | null = null;
  private isConnected = false;
  private dataBuffer: Buffer[] = [];
  private bufferTimeout: NodeJS.Timeout | null = null;
  private readonly BUFFER_FLUSH_INTERVAL = 100;
  private readonly MAX_BUFFER_SIZE = 100;

  constructor(
    // 确保这两个服务在模块中被正确提供 (provided)
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    // 移除了构造函数中的检查，因为这会导致在实例创建时立即执行
    // 检查将推迟到实际使用服务时进行
  }

  async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        productId: port.productId,
        vendorId: port.vendorId,
      }));
    } catch (error: any) {
      console.error('Error listing ports:', error);
      await this.sendLog('error', `获取串口列表失败: ${error.message}`);
      return [];
    }
  }

  async connect() {
    if (this.isConnected) {
      await this.disconnect();
    }

    try {
      
      // 关键检查：直接检查注入的 configService
      if (!this.configService) {
        const errorMsg = '配置服务未正确初始化，请重启应用程序';
        console.error('Connection error: this.configService is undefined');
        await this.sendLog('error', errorMsg);
        await this.sendStatusUpdate('error');
        return false;
      }

      // 直接使用 this.configService
      const serialConfig = this.configService.getSerialConfig();

      if (!serialConfig) {
        throw new Error('串口配置为空，请检查配置文件');
      }

      if (!serialConfig.port) {
        throw new Error('未选择串口');
      }

      await this.sendLog('info', `尝试连接 ${serialConfig.port} (${serialConfig.baudRate}, ${serialConfig.dataBits}, ${serialConfig.stopBits}, ${serialConfig.parity})...`);

      this.serialPort = new SerialPort({
        path: serialConfig.port,
        baudRate: serialConfig.baudRate,
        dataBits: serialConfig.dataBits as 5 | 6 | 7 | 8,
        stopBits: serialConfig.stopBits as 1 | 2,
        parity: serialConfig.parity as 'none' | 'even' | 'odd' | 'mark' | 'space',
      });

      this.serialPort.on('open', () => {
        this.isConnected = true;
        this.sendStatusUpdate('connected');
        this.sendLog('success', '串口连接成功');
      });

      this.serialPort.on('data', (data) => {
        console.log('raw data:', data.toString());
        this.sendLog('data', `收到数据: ${data.toString()}`);
        this.addToBuffer(data);
      });

      this.serialPort.on('error', (error) => {
        this.sendLog('error', `串口错误: ${error.message}`);
        this.sendStatusUpdate('error');
        this.isConnected = false;
      });

      this.serialPort.on('close', () => {
        this.isConnected = false;
        this.sendStatusUpdate('disconnected');
        this.sendLog('info', '串口连接已断开');
      });

      return true;
    } catch (error: any) {
      console.error('Connection error:', error);
      await this.sendLog('error', `串口连接失败: ${error.message}`);
      await this.sendStatusUpdate('error');
      return false;
    }
  }

  async disconnect() {
    if (this.serialPort && this.isConnected) {
      this.serialPort.close((err) => {
        if (err) {
          console.error('Error closing port:', err);
          this.sendLog('error', `关闭串口失败: ${err.message}`);
        }
      });
      this.serialPort = null;
      this.isConnected = false;
      await this.sendStatusUpdate('disconnected');
    }
  }

  getStatus(): string {
    if (this.isConnected && this.configService) { // 直接检查
      try {
        const config = this.configService.getSerialConfig(); // 直接使用
        return `connected (${config.port})`;
      } catch (error) {
        console.error('Error getting serial config in getStatus:', error);
        return 'connected (unknown)';
      }
    }
    return this.serialPort ? 'connecting' : 'disconnected';
  }

  private async sendStatusUpdate(status: string) {
    const mainWindow = await getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('serial-status-update', status);
    }
  }

  private async sendLog(type: string, message: string) {
    const mainWindow = await getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('new-log-entry', {
        id: Date.now() + Math.random(),
        type,
        message,
        timestamp: new Date().toISOString(),
      });
    }

    // 直接使用 this.httpService
    if (this.httpService) {
      (this.httpService as any).sendLog(type as 'info' | 'error', message);
    }
  }

  private addToBuffer(data: Buffer) {
    this.dataBuffer.push(data);

    if (this.dataBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushBuffer();
      return;
    }

    if (!this.bufferTimeout) {
      this.bufferTimeout = setTimeout(() => {
        this.flushBuffer();
      }, this.BUFFER_FLUSH_INTERVAL);
    }
  }

  private flushBuffer() {
    if (this.dataBuffer.length > 0 && this.httpService) { // 直接使用
      const combinedData = Buffer.concat(this.dataBuffer);
      this.httpService.sendData(combinedData); // 直接使用
      this.dataBuffer = [];
    }

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
  }
}