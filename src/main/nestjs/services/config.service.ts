import { Injectable } from '@nestjs/common';
import Store from 'electron-store';

export interface SerialConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
}

export interface HttpConfig {
  url: string;
}

export interface AppConfig {
  serial: SerialConfig;
  http: HttpConfig;
}

@Injectable()
export class ConfigService {
  private store: Store<AppConfig>;

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: {
        serial: {
          port: '',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        },
        http: {
          url: 'http://example.com/api/v1/data',
        },
      },
    });
  }

  getConfig(): AppConfig {
    return this.store.store;
  }

  setConfig(config: AppConfig): void {
    this.store.store = config;
  }

  getSerialConfig(): SerialConfig {
    return this.store.get('serial');
  }

  getHttpConfig(): HttpConfig {
    return this.store.get('http');
  }

  setSerialConfig(config: SerialConfig): void {
    this.store.set('serial', config);
  }

  setHttpConfig(config: HttpConfig): void {
    this.store.set('http', config);
  }
}