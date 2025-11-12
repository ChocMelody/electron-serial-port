import { defineStore } from 'pinia'

interface SerialConfig {
  port: string
  baudRate: number
  dataBits: number
  stopBits: number
  parity: string
}

interface HttpConfig {
  url: string
}

interface AppConfig {
  serial: SerialConfig
  http: HttpConfig
}

export const useConfigStore = defineStore('config', {
  state: () => ({
    serialConfig: {
      port: '',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    } as SerialConfig,
    
    httpConfig: {
      url: 'http://example.com/api/v1/data'
    } as HttpConfig
  }),
  
  actions: {
    setSerialConfig(config: SerialConfig) {
      this.serialConfig = config
    },
    
    setHttpConfig(config: HttpConfig) {
      this.httpConfig = config
    },
    
    setConfig(config: AppConfig) {
      this.serialConfig = config.serial
      this.httpConfig = config.http
    }
  },
  
  getters: {
    getConfig: (state) => ({
      serial: state.serialConfig,
      http: state.httpConfig
    })
  }
})