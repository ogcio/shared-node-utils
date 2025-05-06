import { describe, it, expect } from 'vitest';
import { tokenMutex } from '../src/tokenService';

// Simple helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Mutex.runExclusive', () => {
  it('serializes concurrent executions', async () => {
    const order: string[] = [];

    const task1 = tokenMutex.runExclusive(async () => {
      order.push('start1');
      await delay(50);
      order.push('end1');
      return 1;
    });

    const task2 = tokenMutex.runExclusive(async () => {
      order.push('start2');
      await delay(10);
      order.push('end2');
      return 2;
    });

    const results = await Promise.all([task1, task2]);

    expect(results).toEqual([1, 2]);
    expect(order).toEqual(['start1', 'end1', 'start2', 'end2']);
  });

  it('propagates return values', async () => {
    const result = await tokenMutex.runExclusive(async () => 'hello');
    expect(result).toBe('hello');
  });

  it('releases lock after an error and allows subsequent executions', async () => {
    // First, run a task that throws
    await expect(
      tokenMutex.runExclusive(async () => {
        throw new Error('failure');
      })
    ).rejects.toThrow('failure');

    // Then ensure the mutex is free for new tasks
    const result = await tokenMutex.runExclusive(async () => 'recovered');
    expect(result).toBe('recovered');
  });
});
