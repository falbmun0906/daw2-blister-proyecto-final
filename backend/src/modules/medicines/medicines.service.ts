import { Types } from 'mongoose';

import { type BlisterRole } from '../../types/blister.types';
import { type MedicineDocument } from '../../types/medicine.types';
import {
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
} from '../../constants/http.constants';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { NotificationModel } from '../../models/notification.model';
import { TreatmentModel } from '../../models/treatment.model';
import { AdherenceLogModel } from '../../models/adherenceLog.model';
import { AppError } from '../../utils/app-error';
import {
  externalGetMedicineInfo,
  externalGetMedicineInfoByCn,
} from '../external/external.service';
import {
  normalizeMedicineIconType,
} from './medicines.utils';
import { notifyStockLow } from '../notifications/notifications.service';
import {
  type CreateMedicineInput,
  type CreateCimaMedicineInput,
  type MedicinesListQuery,
  type UpdateMedicineInput,
} from '../../../../shared/schemas';

interface MedicineView extends Omit<MedicineDocument, '_id' | 'blisterId' | 'deletedAt'> {
  id: string;
  _id: string;
  blisterId: string;
  alias: string | null;
}

interface MedicinesListResult {
  medicines: MedicineView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const WRITER_ROLES: BlisterRole[] = ['OWNER', 'CAREGIVER'];
const LEGACY_MEDICINE_UNIQUE_INDEX_NAME = 'nregist_1_blisterId_1';
type OfficialMedicineInfo = Awaited<ReturnType<typeof externalGetMedicineInfo>>;

const toMedicineView = (medicine: Awaited<ReturnType<typeof MedicineModel.findOne>>): MedicineView => ({
  id: medicine!._id.toString(),
  _id: medicine!._id.toString(),
  blisterId: medicine!.blisterId.toString(),
  source: medicine!.source ?? 'cima',
  identityLocked: medicine!.source !== 'custom' || medicine!.identityLocked === true,
  captureMethod: medicine!.captureMethod ?? 'search',
  customDetails: medicine!.customDetails ?? null,
  nregist: medicine!.nregist,
  cn: medicine!.cn ?? null,
  presentationName: medicine!.presentationName ?? null,
  nombre: medicine!.nombre,
  alias: medicine!.alias?.trim() || null,
  pactivos: medicine!.pactivos,
  formaOficial: medicine!.formaOficial,
  dosisOficial: medicine!.dosisOficial,
  iconType: medicine!.iconType,
  stock: medicine!.stock,
  stockUnit: medicine!.stockUnit,
  threshold: medicine!.threshold,
  expDate: medicine!.expDate,
  cimaStatus: medicine!.cimaStatus,
});

const getMedicineDocument = async (blisterId: string, medicineId: string) => {
  const medicine = await MedicineModel.findOne({
    _id: new Types.ObjectId(medicineId),
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
  });

  if (!medicine) {
    throw new AppError({
      code: 'MEDICINE_NOT_FOUND',
      message: 'Medicine not found in this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return medicine;
};

const hasMongoErrorCode = (error: unknown, code: number): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code;

const hasMongoErrorCodeName = (error: unknown, codeName: string): boolean =>
  typeof error === 'object' && error !== null && 'codeName' in error && error.codeName === codeName;

const isMongoDuplicateError = (error: unknown): boolean => hasMongoErrorCode(error, 11000);

const isMongoIndexNotFoundError = (error: unknown): boolean =>
  hasMongoErrorCode(error, 27) || hasMongoErrorCodeName(error, 'IndexNotFound');

const dropLegacyMedicineUniqueIndex = async (): Promise<void> => {
  try {
    await MedicineModel.collection.dropIndex(LEGACY_MEDICINE_UNIQUE_INDEX_NAME);
  } catch (error: unknown) {
    if (!isMongoIndexNotFoundError(error)) {
      throw error;
    }
  }
};

const createInventoryDocument = async (data: Partial<MedicineDocument>) => {
  try {
    return await MedicineModel.create(data);
  } catch (error: unknown) {
    if (!isMongoDuplicateError(error)) throw error;
    // Old deployments used a unique registry/blister index, including null registries.
    await dropLegacyMedicineUniqueIndex();
    return MedicineModel.create(data);
  }
};

const ensureWriterRole = (blisterRole: BlisterRole, allowedRoles: BlisterRole[] = WRITER_ROLES): void => {
  if (!allowedRoles.includes(blisterRole)) {
    throw new AppError({
      code: 'BLISTER_ROLE_FORBIDDEN',
      message: 'Your role does not allow this action.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }
};

const createMedicineDocument = async (
  blisterObjectId: Types.ObjectId,
  officialMedicine: OfficialMedicineInfo,
  input: CreateCimaMedicineInput,
  formaOficial: string,
) =>
  createInventoryDocument({
    blisterId: blisterObjectId,
    source: 'cima',
    captureMethod: input.captureMethod ?? 'search',
    nregist: officialMedicine.nregist,
    cn: officialMedicine.cn ?? null,
    presentationName: officialMedicine.presentationName ?? null,
    nombre: officialMedicine.nombre,
    alias: input.alias?.trim() || null,
    pactivos: officialMedicine.pactivos,
    formaOficial,
    dosisOficial: officialMedicine.dosisOficial ?? 'No disponible',
    iconType: normalizeMedicineIconType(formaOficial),
    stock: input.stock,
    stockUnit: input.stockUnit,
    threshold: input.threshold,
    expDate: input.expDate,
    cimaStatus: officialMedicine.cimaStatus,
  });

/**
 * Lists medicines in a blister with standard collection pagination metadata.
 */
export const medicinesList = async (
  blisterId: string,
  query: MedicinesListQuery,
): Promise<MedicinesListResult> => {
  const { page, limit } = query;
  const filter = {
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
  };
  const [medicines, total] = await Promise.all([
    MedicineModel.find(filter)
      .sort({ nombre: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MedicineModel.countDocuments(filter),
  ]);

  return {
    medicines: medicines.map((medicine) => toMedicineView(medicine)),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Creates a user-defined product or enriches a medicine with official CIMA data.
 */
export const medicinesCreate = async (
  blisterId: string,
  blisterRole: BlisterRole,
  input: CreateMedicineInput,
): Promise<MedicineView> => {
  ensureWriterRole(blisterRole);

  if (input.source === 'custom') {
    const medicine = await createInventoryDocument({
      blisterId: new Types.ObjectId(blisterId),
      source: 'custom',
      captureMethod: input.captureMethod ?? 'manual',
      nombre: input.nombre,
      customDetails: input.customDetails,
      alias: input.alias?.trim() || null,
      nregist: null,
      pactivos: null,
      formaOficial: null,
      dosisOficial: null,
      cimaStatus: null,
      iconType: normalizeMedicineIconType(input.customDetails.format ?? ''),
      stock: input.stock,
      stockUnit: input.stockUnit,
      threshold: input.threshold,
      expDate: input.expDate,
    });
    return toMedicineView(medicine);
  }

  const officialMedicine = input.cn
    ? await externalGetMedicineInfoByCn(input.cn)
    : await externalGetMedicineInfo(input.nregist);
  if (officialMedicine.nregist !== input.nregist) {
    throw new AppError({
      code: 'MEDICINE_CODE_MISMATCH',
      message: 'El Código Nacional no corresponde al medicamento seleccionado. Repite la búsqueda.',
      statusCode: 400,
    });
  }
  const formaOficial = officialMedicine.formaOficial ?? officialMedicine.formaSimplificada ?? 'DESCONOCIDA';
  const blisterObjectId = new Types.ObjectId(blisterId);

  const medicine = await createMedicineDocument(blisterObjectId, officialMedicine, input, formaOficial);
  return toMedicineView(medicine);
};

/**
 * Updates local inventory fields for a blister medicine.
 */
export const medicinesUpdate = async (
  blisterId: string,
  medicineId: string,
  blisterRole: BlisterRole,
  input: UpdateMedicineInput,
): Promise<MedicineView> => {
  ensureWriterRole(blisterRole);

  const medicine = await getMedicineDocument(blisterId, medicineId);

  if (
    medicine.source !== 'custom' &&
    (input.nombre !== undefined || input.customDetails !== undefined || input.expDate === null)
  ) {
    throw new AppError({
      code: 'OFFICIAL_MEDICINE_FIELDS',
      message: 'Los datos oficiales no son editables y la caducidad es obligatoria para medicamentos CIMA.',
      statusCode: 400,
    });
  }
  const detailKeys = ['productType', 'brand', 'composition', 'format', 'strength'] as const;
  const identityChanged =
    (input.nombre !== undefined && input.nombre.trim() !== medicine.nombre) ||
    (input.customDetails !== undefined && detailKeys.some((key) =>
      (input.customDetails?.[key]?.trim() || '') !== (medicine.customDetails?.[key]?.trim() || ''),
    ));
  const identityError = () => new AppError({
    code: 'MEDICINE_IDENTITY_LOCKED',
    message: 'Este producto ya se ha utilizado en una pauta o toma. Crea otro producto para cambiar su identidad; puedes editar alias, stock, umbral y caducidad.',
    statusCode: HTTP_STATUS_CONFLICT,
  });
  if (identityChanged && (medicine.identityLocked ||
    await TreatmentModel.exists({ blisterId: medicine.blisterId, 'medicines.medicineId': medicine._id }) ||
    await AdherenceLogModel.exists({ blisterId: medicine.blisterId, medicineId: medicine._id }))) {
    throw identityError();
  }
  if (input.nombre !== undefined) medicine.nombre = input.nombre;
  if (input.customDetails !== undefined) {
    medicine.customDetails = input.customDetails;
    medicine.iconType = normalizeMedicineIconType(input.customDetails.format ?? '');
  }

  if (input.alias !== undefined) {
    medicine.alias = input.alias.trim() || null;
  }

  if (input.stock !== undefined) {
    medicine.stock = input.stock;
  }

  if (input.threshold !== undefined) {
    medicine.threshold = input.threshold;
  }

  if (input.expDate !== undefined) {
    medicine.expDate = input.expDate;
  }

  try {
    await medicine.save();
  } catch (error) {
    // Assignment increments the version before referencing a custom product.
    if (error instanceof Error && error.name === 'VersionError') {
      if (identityChanged) throw identityError();
      throw new AppError({ code: 'MEDICINE_UPDATE_CONFLICT', message: 'El producto ha cambiado. Recarga los datos antes de guardar.', statusCode: HTTP_STATUS_CONFLICT });
    }
    throw error;
  }

  if (input.expDate !== undefined) {
    await NotificationModel.deleteMany({
      blisterId: medicine.blisterId,
      type: 'expiration_warning',
      dismissedAt: null,
      'metadata.medicineId': medicineId,
    });
  }

  if (
    (input.stock !== undefined || input.threshold !== undefined) &&
    medicine.stock <= medicine.threshold
  ) {
    const blister = await BlisterModel.findOne({
      _id: new Types.ObjectId(blisterId),
      deletedAt: null,
    });
    if (blister) {
      await notifyStockLow(medicine, blister);
    }
  }

  return toMedicineView(medicine);
};

/**
 * Archives a medicine from the blister inventory for owners only.
 */
export const medicinesDelete = async (
  blisterId: string,
  medicineId: string,
  blisterRole: BlisterRole,
): Promise<void> => {
  ensureWriterRole(blisterRole, ['OWNER']);

  const medicine = await getMedicineDocument(blisterId, medicineId);
  const activeTreatments = await TreatmentModel.countDocuments({
    blisterId: new Types.ObjectId(blisterId),
    active: true,
    deletedAt: null,
    medicines: {
      $elemMatch: {
        medicineId: medicine._id,
      },
    },
  });

  if (activeTreatments > 0) {
    throw new AppError({
      code: 'MEDICINE_IN_ACTIVE_TREATMENT',
      message: 'No puedes eliminar un medicamento asignado a tratamientos activos. Finaliza o edita esas pautas antes de eliminarlo.',
      statusCode: HTTP_STATUS_CONFLICT,
    });
  }

  medicine.deletedAt = new Date();
  await medicine.save();

  await NotificationModel.deleteMany({
    blisterId: new Types.ObjectId(blisterId),
    dismissedAt: null,
    type: { $in: ['stock_low', 'stock_depleted', 'expiration_warning', 'dose_reminder'] },
    'metadata.medicineId': medicineId,
  });
};
