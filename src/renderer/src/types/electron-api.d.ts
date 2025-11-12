export interface SerialPortInfo {
  path: string;
  manufacturer: string;
  serialNumber: string;
  pnpId: string;
  locationId: string;
  vendorId: string;
  productId: string;
}

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

export interface LogEntry {
  id?: number | string;
  type: string;
  message: string;
  timestamp: Date | string;
}

export interface HttpLogEntry {
  id?: number | string;
  code: number;
  message: string;
  response?: any;
  request?: any;
  error?: string;
  timestamp: Date | string;
}

export interface ElectronAPI {
  getPorts: () => Promise<SerialPortInfo[]>;
  getConfig: () => Promise<AppConfig>;
  setConfig: (config: AppConfig) => Promise<void>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  onSerialStatusUpdate: (callback: (status: string) => void) => () => void;
  onNewLogEntry: (callback: (entry: LogEntry) => void) => () => void;
  onHttpLogEntry: (callback: (entry: HttpLogEntry) => void) => () => void;
  removeAllListeners: (event: string) => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}