import { Module } from '@nestjs/common';
import { ConfigService } from './services/config.service';
import { SerialPortService } from './services/serialport.service';
import { HttpService } from './services/http.service';

@Module({
  imports: [],
  controllers: [],
  providers: [
    ConfigService,
    SerialPortService,
    HttpService,
  ],
  exports: [
    ConfigService,
    SerialPortService,
    HttpService,
  ],
})
export class AppModule {}