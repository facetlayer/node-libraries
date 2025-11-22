/*
  Limiter.ts

  Used when you want to make parallel calls to an async function, with a
  limit of how many can be running at once.
*/

import { ListeningPromiseList } from "./ListeningPromiseList";

const VerboseLog = false;

function verboseLog(...args: any[]) {
  if (VerboseLog) {
    console.log(...args);
  }
}

export interface LimiterOptions {
  maxConcurrent: number;
}

export class Limiter {
  options: LimiterOptions;

  activeTaskCount = 0;
  waitingForLimit: Promise<void> | null = null;
  resolveWaitingForLimit: (() => void) | null = null;
  
  waitingForAllSettled: ListeningPromiseList = new ListeningPromiseList();

  constructor(options: LimiterOptions) {
    if (options.maxConcurrent <= 0) {
      throw new Error('maxConcurrent must be greater than 0');
    }
    this.options = options;
  }

  // Try to start the provided task.
  //
  // This returns a promise that is resolved once this task has STARTED.
  // (not finished).
  //
  // When adding tasks, you should await on start(), because this will stop
  // you from continuing to add tasks when we're at the limit.
  //
  // Make sure to have a 'catch' in your task function to handle errors.
  async start<T>(fn: () => Promise<T>) {
    for (;;) {
      if (this.activeTaskCount < this.options.maxConcurrent) {
        // Ready to start this task.
        const promise = fn();

        this.activeTaskCount++;

        verboseLog('Limiter.launched task, activeTaskCount:', this.activeTaskCount);

        promise.finally(
          () => this.onTaskFinished(),
        );

        return;
      }

      // We're at the concurrency limit.

      if (!this.waitingForLimit) {
        verboseLog('Limiter.start is now waiting for limit, activeTaskCount:', this.activeTaskCount);

        // Set up a promise that will resolve when we can start a new task.
        this.waitingForLimit = new Promise((resolve) => {
          this.resolveWaitingForLimit = resolve;
        });
      }

      await this.waitingForLimit;

      verboseLog('Limiter - trying again to start task, activeTaskCount:', this.activeTaskCount);

      // After waiting for this promise, we still need to check .activeTaskCount
      // again (in case there are multiple tasks waiting).
    }
  }

  onTaskFinished() {
    this.activeTaskCount--;
    
    verboseLog('Limiter.onTaskFinished, activeTaskCount:', this.activeTaskCount);
    
    if (
      this.activeTaskCount < this.options.maxConcurrent &&
      this.resolveWaitingForLimit
    ) {

      // We can resolve the waiting promise.
      const resolve = this.resolveWaitingForLimit;
      this.resolveWaitingForLimit = null;
      this.waitingForLimit = null;
      resolve();
    }

    if (this.activeTaskCount === 0) {
      verboseLog('Limiter.onTaskFinished - all tasks are finished');
      
      this.waitingForAllSettled.resolveAll();
    }
  }

  /*
    Returns a promise that resolves when all tasks have finished.

    Make sure you call this AFTER you have called start() for all your tasks,
    otherwise it may resolve too early.
  */
  allSettled() {
    // Returns a promise that resolves when all tasks have finished.
    if (this.activeTaskCount === 0) {
      // No tasks are running, so we can resolve immediately.
      return Promise.resolve();
    } else {
      // There are still tasks running, so we need to wait for them to finish.
      return this.waitingForAllSettled.addPromise();
    }
  }
}

// forEachWithConcurrentLimit
//
// Similar to items.forEach(callback) but it also uses a Limiter
// to limit the number of concurrent calls to the callback function.
export async function forEachWithConcurrentLimit<T>(
  items: T[],
  options: LimiterOptions,
  callback: (item: T) => Promise<void>,
): Promise<void> {
  const limiter = new Limiter(options);
  const errors: Error[] = [];

  for (const item of items) {
    await limiter.start(() => callback(item).catch((err) => {
      errors.push(err);
    }));
  }

  await limiter.allSettled();

  if (errors.length > 0) {
    throw errors[0];
  }
}

