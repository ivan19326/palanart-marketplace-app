import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

// One service instance, persistent disk. Reservations count failures too: no free retry loop.
export function createFileQuota({ path, dailyLimit = 100, clock = () => new Date() }) {
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 1000) throw new Error('Invalid daily limit');
  let queue = Promise.resolve();
  return { reserve() {
    const task = queue.then(async () => {
      const day = clock().toISOString().slice(0, 10);
      let state;
      try { state = JSON.parse(await readFile(path, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; state = { day, count: 0 }; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(state.day) || !Number.isInteger(state.count) || state.count < 0) throw new Error('Invalid quota state');
      if (state.day > day) throw new Error('Clock moved backwards');
      if (state.day !== day) state = { day, count: 0 };
      if (state.count >= dailyLimit) return false;
      state.count++;
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path + '.next', JSON.stringify(state), { mode: 0o600 });
      await rename(path + '.next', path);
      return true;
    });
    queue = task.catch(() => {});
    return task;
  } };
}
