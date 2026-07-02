import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notifications')
export class NotificationsWorker extends WorkerHost {
  async process(job: Job<Record<string, unknown>>): Promise<void> {
    void job;
  }
}
