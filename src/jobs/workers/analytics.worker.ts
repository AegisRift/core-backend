import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('analytics')
export class AnalyticsWorker extends WorkerHost {
  async process(job: Job<Record<string, unknown>>): Promise<void> {
    void job;
  }
}
