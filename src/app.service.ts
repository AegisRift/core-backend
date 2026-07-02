import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'keuwo-backend',
      architecture: 'modular-monolith-event-driven',
    };
  }
}
