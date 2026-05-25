// Job queue stub — wire BullMQ or similar here
export interface JobQueue {
  enqueue<T>(jobName: string, data: T, options?: { delay?: number }): Promise<void>;
}

export class InMemoryQueue implements JobQueue {
  async enqueue<T>(jobName: string, data: T): Promise<void> {
    // In-memory: fire-and-forget via setTimeout
    setTimeout(() => {
      console.log(`[Queue] Processing job: ${jobName}`, data);
    }, 0);
  }
}

export const queue: JobQueue = new InMemoryQueue();
