import { Module } from '@nestjs/common';
import { LoggerModule as PinoModule } from 'nestjs-pino';

import { CorrelationContext } from '../../shared/utils/correlation-context';

@Module({
  imports: [
    PinoModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        autoLogging: true,
        customProps: () => ({
          service: 'keuwo-backend',
          correlationId: CorrelationContext.getCorrelationId(),
        }),
      },
    }),
  ],
  exports: [PinoModule],
})
export class LoggerModule {}
