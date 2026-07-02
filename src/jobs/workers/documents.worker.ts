import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('documents')
export class DocumentsWorker extends WorkerHost {
  async process(job: Job<Record<string, unknown>>): Promise<void> {
    void job;
  }
}
