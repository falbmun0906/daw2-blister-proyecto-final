import { Types } from 'mongoose';

import {
  CIMA_REGISTRO_CAMBIOS_NOTIFICATION_FIELDS,
  CIMA_CHANGE_TYPES,
  CIMA_SYNC_META_KEY,
  DEFAULT_CIMA_SYNC_LOOKBACK_DAYS,
} from '../../constants/domain.constants';
import { MedicineModel } from '../../models/medicine.model';
import { SystemMetaModel } from '../../models/systemMeta.model';
import { CimaChangeLogModel } from '../../models/cimaChangeLog.model';
import { BlisterModel } from '../../models/blister.model';
import {
  type CimaSyncMeta,
} from '../../types/system-meta.types';
import {
  type CimaChangeLogDocument,
  type CimaChangeType,
} from '../../types/cima-change-log.types';
import {
  type MedicineDocument,
} from '../../types/medicine.types';
import {
  type CimaRegistroCambiosItem,
  type ExternalMedicineInfo,
} from '../external/external.types';
import * as externalService from '../external/external.service';
import { normalizeMedicineIconType } from '../medicines/medicines.utils';
import { notifyCimaChange } from '../notifications/notifications.service';

const DEFAULT_CIMA_SYNC_META: CimaSyncMeta = {
  lastRunAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  lastCimaSync: null,
};

const CIMA_RELEVANT_NOTIFICATION_CHANGES = new Set<string>(
  CIMA_REGISTRO_CAMBIOS_NOTIFICATION_FIELDS,
);

type PersistedMedicine = NonNullable<Awaited<ReturnType<typeof MedicineModel.findOne>>>;

const toDate = (value: number | string | null | undefined): Date => {
  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

export const formatCimaSyncDate = (date: Date): string => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const sanitizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 300);
  }

  return 'Unexpected CIMA sync error.';
};

const mapTipoCambio = (tipoCambio?: number | null): CimaChangeType => {
  switch (tipoCambio) {
    case 1:
      return CIMA_CHANGE_TYPES[0];
    case 2:
      return CIMA_CHANGE_TYPES[1];
    case 3:
    default:
      return CIMA_CHANGE_TYPES[2];
  }
};

const buildDefaultStartDate = (): string => {
  const baseline = new Date();
  baseline.setDate(baseline.getDate() - DEFAULT_CIMA_SYNC_LOOKBACK_DAYS);

  return formatCimaSyncDate(baseline);
};

const isRelevantCimaChange = (cambios: string[]): boolean =>
  cambios.some((change) => CIMA_RELEVANT_NOTIFICATION_CHANGES.has(change));

const applyOfficialMedicineInfo = async (
  medicine: PersistedMedicine,
  officialMedicine: ExternalMedicineInfo,
): Promise<void> => {
  const formaOficial =
    officialMedicine.formaOficial ?? officialMedicine.formaSimplificada ?? medicine.formaOficial;

  medicine.nombre = officialMedicine.nombre;
  medicine.pactivos = officialMedicine.pactivos;
  medicine.formaOficial = formaOficial;
  medicine.dosisOficial = officialMedicine.dosisOficial ?? medicine.dosisOficial;
  medicine.iconType = normalizeMedicineIconType(formaOficial);
  medicine.cimaStatus = {
    ...officialMedicine.cimaStatus,
  };

  await medicine.save();
};

const createChangeLogFromRegistroCambios = async (
  item: CimaRegistroCambiosItem,
  medicineId?: Types.ObjectId | null,
): Promise<CimaChangeLogDocument> => {
  const payload = {
    medicineId: medicineId ?? null,
    nregist: item.nregistro ?? '',
    tipoCambio: mapTipoCambio(item.tipoCambio),
    cambios: item.cambios ?? [],
    fechaCambio: toDate(item.fecha),
    raw: (item as Record<string, unknown>) ?? null,
  };

  const existing = await CimaChangeLogModel.findOne({
    medicineId: payload.medicineId,
    nregist: payload.nregist,
    tipoCambio: payload.tipoCambio,
    fechaCambio: payload.fechaCambio,
    cambios: payload.cambios,
  });

  if (existing) {
    return existing;
  }

  return CimaChangeLogModel.create(payload);
};

/**
 * Returns the persisted CIMA sync metadata or the default empty state.
 */
export const getCimaSyncMeta = async (): Promise<CimaSyncMeta> => {
  const document = await SystemMetaModel.findOne({
    key: CIMA_SYNC_META_KEY,
  }).lean();

  if (!document) {
    return { ...DEFAULT_CIMA_SYNC_META };
  }

  return {
    ...DEFAULT_CIMA_SYNC_META,
    ...(document.value as Partial<CimaSyncMeta>),
  };
};

/**
 * Merges and persists CIMA sync metadata under the global `cimaSync` key.
 */
export const updateCimaSyncMeta = async (
  partial: Partial<CimaSyncMeta>,
): Promise<CimaSyncMeta> => {
  const current = await getCimaSyncMeta();
  const nextValue: CimaSyncMeta = {
    ...current,
    ...partial,
  };

  await SystemMetaModel.findOneAndUpdate(
    {
      key: CIMA_SYNC_META_KEY,
    },
    {
      key: CIMA_SYNC_META_KEY,
      value: nextValue,
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  );

  return nextValue;
};

const processRegistroCambiosItem = async (item: CimaRegistroCambiosItem): Promise<void> => {
  const nregist = item.nregistro?.trim();

  if (!nregist) {
    return;
  }

  const medicines = await MedicineModel.find({
    nregist,
  });

  if (medicines.length === 0) {
    await createChangeLogFromRegistroCambios(item, null);
    return;
  }

  for (const medicine of medicines) {
    const changeLog = await createChangeLogFromRegistroCambios(item, medicine._id);
    let officialMedicine: ExternalMedicineInfo | null = null;

    if ((item.cambios ?? []).length > 0) {
      try {
        officialMedicine = await externalService.externalGetMedicineInfo(nregist);
        await applyOfficialMedicineInfo(medicine, officialMedicine);
      } catch {
        officialMedicine = null;
      }
    }

    const blister = await BlisterModel.findOne({
      _id: medicine.blisterId,
      deletedAt: null,
    });

    if (blister && isRelevantCimaChange(changeLog.cambios)) {
      await notifyCimaChange(medicine, blister, changeLog);
    }

    if (!officialMedicine) {
      continue;
    }
  }
};

/**
 * Synchronizes local medicines against CIMA incremental changes using `/registroCambios`.
 */
export const syncCimaFromRegistroCambios = async (): Promise<void> => {
  const runAt = new Date();
  const meta = await getCimaSyncMeta();
  const requestedFecha = meta.lastCimaSync ?? buildDefaultStartDate();

  try {
    const changes = await externalService.externalGetRegistroCambios(requestedFecha);

    for (const item of changes) {
      await processRegistroCambiosItem(item);
    }

    await updateCimaSyncMeta({
      lastRunAt: runAt,
      lastSuccessAt: runAt,
      lastErrorAt: null,
      lastErrorMessage: null,
      lastCimaSync: formatCimaSyncDate(runAt),
    });
  } catch (error: unknown) {
    await updateCimaSyncMeta({
      lastRunAt: runAt,
      lastErrorAt: runAt,
      lastErrorMessage: sanitizeErrorMessage(error),
    });

    throw error;
  }
};

/**
 * Runs the high-level CIMA sync job, leaving metadata ready for external cron orchestration.
 */
export const runCimaSyncJob = async (): Promise<void> => {
  await syncCimaFromRegistroCambios();
};
