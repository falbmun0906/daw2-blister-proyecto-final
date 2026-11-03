import { connectDb, disconnectDb } from '../../config/db';
import { MedicineModel } from '../../models/medicine.model';

/** Optional, idempotent backfill. Legacy documents are already read as CIMA.
 * Explicitly run against the intended database after taking a backup.
 */
export async function migrateMedicineOrigins(): Promise<number> {
  const result = await MedicineModel.collection.updateMany(
    { source: { $exists: false } },
    { $set: { source: 'cima', captureMethod: 'search' } },
  );
  const indexes = await MedicineModel.collection.indexes();
  if (indexes.some((index) => index.name === 'nregist_1_blisterId_1')) {
    await MedicineModel.collection.dropIndex('nregist_1_blisterId_1');
  }
  return result.modifiedCount;
}

if (require.main === module) {
  void (async () => {
    try {
      await connectDb();
      console.log(`Registros actualizados: ${await migrateMedicineOrigins()}`);
    } catch {
      console.error(
        'No se ha completado la migración de orígenes. Revisa la conexión y los permisos de la base de datos.',
      );
      process.exitCode = 1;
    } finally {
      await disconnectDb();
    }
  })();
}
