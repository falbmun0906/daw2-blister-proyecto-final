import { runCimaSyncJob } from './cima-sync.service';

void (async () => {
  try {
    await runCimaSyncJob();
  } catch {
    process.exitCode = 1;
  }
})();
