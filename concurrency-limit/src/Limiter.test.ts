import { describe, it, expect } from 'vitest';
import { Limiter, forEachWithConcurrentLimit } from './index';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Limiter', () => {
  it('should throw if maxConcurrent is 0', () => {
    expect(() => new Limiter({ maxConcurrent: 0 })).toThrow(
      'maxConcurrent must be greater than 0'
    );
  });

  it('should throw if maxConcurrent is negative', () => {
    expect(() => new Limiter({ maxConcurrent: -1 })).toThrow(
      'maxConcurrent must be greater than 0'
    );
  });

  it('should run a single task', async () => {
    const limiter = new Limiter({ maxConcurrent: 1 });
    let executed = false;

    await limiter.start(async () => {
      executed = true;
    });

    await limiter.allSettled();
    expect(executed).toBe(true);
  });

  it('should limit concurrent tasks to maxConcurrent', async () => {
    const limiter = new Limiter({ maxConcurrent: 2 });
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const task = async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await delay(50);
      currentConcurrent--;
    };

    // Queue up 5 tasks
    for (let i = 0; i < 5; i++) {
      await limiter.start(task);
    }

    await limiter.allSettled();

    expect(maxConcurrent).toBe(2);
    expect(currentConcurrent).toBe(0);
  });

  it('should track activeTaskCount correctly', async () => {
    const limiter = new Limiter({ maxConcurrent: 3 });

    expect(limiter.activeTaskCount).toBe(0);

    await limiter.start(async () => {
      await delay(100);
    });

    // start() returns immediately after the task starts
    expect(limiter.activeTaskCount).toBe(1);

    await limiter.start(async () => {
      await delay(100);
    });

    expect(limiter.activeTaskCount).toBe(2);

    await limiter.allSettled();
    expect(limiter.activeTaskCount).toBe(0);
  });

  it('should resolve allSettled immediately when no tasks are running', async () => {
    const limiter = new Limiter({ maxConcurrent: 1 });

    const start = Date.now();
    await limiter.allSettled();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it('should wait for all tasks in allSettled', async () => {
    const limiter = new Limiter({ maxConcurrent: 2 });
    const completed: number[] = [];

    for (let i = 0; i < 4; i++) {
      const index = i;
      await limiter.start(async () => {
        await delay(50);
        completed.push(index);
      });
    }

    await limiter.allSettled();

    expect(completed.length).toBe(4);
    expect(completed.sort()).toEqual([0, 1, 2, 3]);
  });

  it('should process tasks in order they were queued', async () => {
    const limiter = new Limiter({ maxConcurrent: 1 });
    const order: number[] = [];

    for (let i = 0; i < 5; i++) {
      const index = i;
      await limiter.start(async () => {
        order.push(index);
        await delay(10);
      });
    }

    await limiter.allSettled();

    expect(order).toEqual([0, 1, 2, 3, 4]);
  });

  it('should handle many concurrent calls', async () => {
    const limiter = new Limiter({ maxConcurrent: 10 });
    let count = 0;

    for (let i = 0; i < 100; i++) {
      await limiter.start(async () => {
        await delay(5);
        count++;
      });
    }

    await limiter.allSettled();

    expect(count).toBe(100);
  });

  it('should allow calling allSettled multiple times', async () => {
    const limiter = new Limiter({ maxConcurrent: 2 });
    let count = 0;

    await limiter.start(async () => {
      await delay(20);
      count++;
    });

    await limiter.allSettled();
    expect(count).toBe(1);

    await limiter.start(async () => {
      await delay(20);
      count++;
    });

    await limiter.allSettled();
    expect(count).toBe(2);
  });
});

describe('forEachWithConcurrentLimit', () => {
  it('should process all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const processed: number[] = [];

    await forEachWithConcurrentLimit(items, { maxConcurrent: 2 }, async (item) => {
      await delay(10);
      processed.push(item);
    });

    expect(processed.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('should respect the concurrency limit', async () => {
    const items = [1, 2, 3, 4, 5, 6];
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    await forEachWithConcurrentLimit(items, { maxConcurrent: 2 }, async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await delay(50);
      currentConcurrent--;
    });

    expect(maxConcurrent).toBe(2);
    expect(currentConcurrent).toBe(0);
  });

  it('should handle empty arrays', async () => {
    const items: number[] = [];
    const processed: number[] = [];

    await forEachWithConcurrentLimit(items, { maxConcurrent: 2 }, async (item) => {
      processed.push(item);
    });

    expect(processed).toEqual([]);
  });

  it('should handle single item arrays', async () => {
    const items = [42];
    const processed: number[] = [];

    await forEachWithConcurrentLimit(items, { maxConcurrent: 2 }, async (item) => {
      processed.push(item);
    });

    expect(processed).toEqual([42]);
  });

  it('should propagate errors', async () => {
    const items = [1, 2, 3];

    await expect(
      forEachWithConcurrentLimit(items, { maxConcurrent: 2 }, async (item) => {
        if (item === 2) {
          throw new Error('Failed on item 2');
        }
        await delay(10);
      })
    ).rejects.toThrow('Failed on item 2');
  });

  it('should pass correct item to callback', async () => {
    const items = ['a', 'b', 'c'];
    const results: string[] = [];

    await forEachWithConcurrentLimit(items, { maxConcurrent: 1 }, async (item) => {
      results.push(item.toUpperCase());
    });

    expect(results).toEqual(['A', 'B', 'C']);
  });
});
