import { connectDb, disconnectDb } from '../../config/db';
import { runCimaSyncJob, getCimaSyncMeta } from './cima-sync.service';

void (async () => {
  try {
    await connectDb();

    const metaBefore = await getCimaSyncMeta();
    console.log('CIMA sync meta BEFORE:', metaBefore);

    await runCimaSyncJob();

    const metaAfter = await getCimaSyncMeta();
    console.log('CIMA sync meta AFTER:', metaAfter);
  } catch (err) {
    console.error('CIMA sync FAILED:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDb();
  }
})();