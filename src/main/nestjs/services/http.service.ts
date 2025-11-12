import { Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from './config.service';

// 使用动态导入避免循环依赖
async function getMainWindow() {
  const { mainWindow } = await import('../../main');
  return mainWindow;
}

@Injectable()
export class HttpService {
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private readonly REQUEST_QUEUE_LIMIT = 50;
  private activeRequests = 0;
  private requestQueue: Array<{
    type: 'log' | 'data';
    payload: any;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  private _configService: ConfigService | null = null;

  constructor(private readonly configService: ConfigService) {
    // 移除了构造函数中的检查，因为这会导致在实例创建时立即执行
    // 检查将推迟到实际使用服务时进行
  }

  private get configServiceInstance(): ConfigService | null {
    if (!this._configService) {
      this._configService = this.configService;
    }
    return this._configService;
  }

  async sendData(data: Buffer) {
    // 检查 configService 是否正确注入
    if (!this.configServiceInstance) {
      console.error('ConfigService is undefined in HttpService sendData');
      return { success: false, error: 'ConfigService not available' };
    }

    const config = this.configServiceInstance.getHttpConfig();
    if (!config.enabled) {
      return { success: true, message: 'HTTP transmission is disabled' };
    }

    // 检查是否超出队列限制
    if (this.requestQueue.length >= this.REQUEST_QUEUE_LIMIT) {
      console.warn('HTTP request queue is full, dropping data request');
      return { success: false, error: 'Request queue full' };
    }

    return new Promise((resolve) => {
      this.requestQueue.push({
        type: 'data',
        payload: data,
        resolve,
        reject: () => resolve({ success: false })
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    // 如果队列为空或达到最大并发数，则不处理
    if (this.requestQueue.length === 0 || this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      return;
    }

    // 从队列中取出一个请求
    const request = this.requestQueue.shift();
    if (!request) return;

    // 增加活跃请求数
    this.activeRequests++;

    try {
      // 检查 configService 是否已正确注入
      if (!this.configServiceInstance) {
        const errorMsg = '配置服务未正确初始化，请重启应用程序';
        console.error('HTTP error: ConfigService is undefined');
        await this.sendLog('error', errorMsg);
        request.reject(new Error(errorMsg));
        return;
      }

      const httpConfig = this.configServiceInstance.getHttpConfig();
      
      if (!httpConfig.url) {
        await this.sendLog('error', 'HTTP URL 未配置');
        request.reject(new Error('HTTP URL 未配置'));
        return;
      }

      await this.sendLog('http', `正在发送数据到 ${httpConfig.url}...`);

      const payload = {
        data_raw: request.data.toString('hex'),
        timestamp: Date.now(),
      };

      const response = await axios.post(httpConfig.url, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await this.sendLog('success', `HTTP POST 成功 (${response.status} ${response.statusText})`);
      request.resolve();
    } catch (error: any) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const statusText = error.response?.statusText || error.message;
        await this.sendLog('error', `HTTP POST 失败: ${status || '未知错误'} ${statusText}`);
      } else {
        await this.sendLog('error', `HTTP POST 失败: ${error.message}`);
      }
      request.reject(error);
    } finally {
      // 减少活跃请求数
      this.activeRequests--;
      // 继续处理队列中的其他请求
      this.processQueue();
    }
  }

  private async sendLog(type: string, message: string) {
    // 检查 configService 是否正确注入
    if (!this.configServiceInstance) {
      console.error('ConfigService is undefined in HttpService sendLog');
      return { success: false, error: 'ConfigService not available' };
    }

    const config = this.configServiceInstance.getHttpConfig();
    if (!config.enabled) {
      return { success: true, message: 'HTTP logging is disabled' };
    }

    // 检查是否超出队列限制
    if (this.requestQueue.length >= this.REQUEST_QUEUE_LIMIT) {
      console.warn('HTTP request queue is full, dropping log request');
      return { success: false, error: 'Request queue full' };
    }

    return new Promise((resolve) => {
      this.requestQueue.push({
        type: 'log',
        payload: { level: type as 'info' | 'error', message, timestamp: new Date().toISOString() },
        resolve,
        reject: () => resolve({ success: false })
      });
      this.processQueue();
    });
  }
}