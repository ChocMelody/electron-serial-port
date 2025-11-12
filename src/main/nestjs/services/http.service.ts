import { Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { ConfigService } from './config.service';

// 使用动态导入避免循环依赖
async function getMainWindow() {
  const { mainWindow } = await import('../../main');
  return mainWindow;
}

interface HttpLogPayload {
  code: number;
  message: string;
  response?: any;
  request?: any;
  error?: string;
}

@Injectable()
export class HttpService {
  constructor(private readonly configService: ConfigService) {}

  async sendData(data: Buffer) {
    const httpConfig = this.configService.getHttpConfig();

    if (!httpConfig || !httpConfig.url) {
      const message = 'HTTP URL 未配置';
      await this.emitRendererLog('error', message);
      await this.emitHttpLog({
        code: 0,
        message,
        request: null,
        error: message,
      });
      return { success: false, error: message };
    }

    const payload = {
      data_raw: data.toString('hex'),
      timestamp: Date.now(),
    };

    await this.emitRendererLog('http', `正在发送数据到 ${httpConfig.url}...`);

    try {
      const response = await axios.post(httpConfig.url, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await this.emitRendererLog('success', `HTTP POST 成功 (${response.status} ${response.statusText})`);
      await this.emitHttpLog({
        code: response.status,
        message: response.statusText || 'OK',
        response: response.data,
        request: payload,
      });

      return { success: true, response: response.data };
    } catch (error: any) {
      if (error instanceof AxiosError) {
        const status = error.response?.status ?? 0;
        const statusText = error.response?.statusText || error.message;
        await this.emitRendererLog('error', `HTTP POST 失败: ${status || '未知错误'} ${statusText}`);
        await this.emitHttpLog({
          code: status,
          message: statusText,
          response: error.response?.data,
          request: payload,
          error: error.message,
        });

        return { success: false, error: statusText };
      }

      const genericMessage = error?.message || '未知错误';
      await this.emitRendererLog('error', `HTTP POST 失败: ${genericMessage}`);
      await this.emitHttpLog({
        code: 0,
        message: genericMessage,
        request: payload,
        error: genericMessage,
      });

      return { success: false, error: genericMessage };
    }
  }

  private async emitRendererLog(type: string, message: string) {
    const mainWindow = await getMainWindow();
    if (!mainWindow) {
      return;
    }

    mainWindow.webContents.send('new-log-entry', {
      id: Date.now() + Math.random(),
      type,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private async emitHttpLog(payload: HttpLogPayload) {
    const mainWindow = await getMainWindow();
    if (!mainWindow) {
      return;
    }

    mainWindow.webContents.send('http-log-entry', {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }
}