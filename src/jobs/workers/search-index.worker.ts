import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('search-index')
export class SearchIndexWorker extends WorkerHost {
  async process(job: Job<Record<string, unknown>>): Promise<void> {
    void job;
  }
}
