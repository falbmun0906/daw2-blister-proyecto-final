import { Types } from 'mongoose';

import { type BlisterRole } from '../../types/blister.types';
import {
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
} from '../../constants/http.constants';
import { MedicineModel } from '../../models/medicine.model';
import { AppError } from '../../utils/app-error';
import {
  externalGetMedicineInfo,
} from '../external/external.service';
import {
  normalizeMedicineIconType,
} from './medicines.utils';
import {
  type CreateMedicineInput,
  type MedicinesListQuery,
  type UpdateMedicineInput,
} from '../../../../shared/schemas';

interface MedicineView {
  id: string;
  blisterId: string;
  nregist: string;
  nombre: string;
  alias: string | null;
  pactivos: string;
  formaOficial: string;
  dosisOficial: string;
  iconType: string;
  stock: number;
  stockUnit: string;
  threshold: number;
  expDate: Date;
  cimaStatus: {
    psum: boolean;
    estado: 1 | 2 | 3;
    hasAlerts: boolean;
  };
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

const toMedicineView = (medicine: Awaited<ReturnType<typeof MedicineModel.findOne>>): MedicineView => ({
  id: medicine!._id.toString(),
  blisterId: medicine!.blisterId.toString(),
  nregist: medicine!.nregist,
  nombre: medicine!.nombre,
  alias: medicine!.alias ?? null,
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

const isMongoDuplicateError = (error: unknown): error is { code: number } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const ensureWriterRole = (blisterRole: BlisterRole, allowedRoles: BlisterRole[] = WRITER_ROLES): void => {
  if (!allowedRoles.includes(blisterRole)) {
    throw new AppError({
      code: 'BLISTER_ROLE_FORBIDDEN',
      message: 'Your role does not allow this action.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }
};

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
 * Creates a medicine in a blister by enriching the local record with official CIMA data.
 */
export const medicinesCreate = async (
  blisterId: string,
  blisterRole: BlisterRole,
  input: CreateMedicineInput,
): Promise<MedicineView> => {
  ensureWriterRole(blisterRole);

  const officialMedicine = await externalGetMedicineInfo(input.nregist);
  const formaOficial = officialMedicine.formaOficial ?? officialMedicine.formaSimplificada ?? 'DESCONOCIDA';

  try {
    const medicine = await MedicineModel.create({
      blisterId: new Types.ObjectId(blisterId),
      nregist: officialMedicine.nregist,
      nombre: officialMedicine.nombre,
      alias: input.alias,
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

    return toMedicineView(medicine);
  } catch (error: unknown) {
    if (isMongoDuplicateError(error)) {
      throw new AppError({
        code: 'MEDICINE_DUPLICATE',
        message: 'This medicine already exists in the blister inventory.',
        statusCode: HTTP_STATUS_CONFLICT,
      });
    }

    throw error;
  }
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

  if (input.alias !== undefined) {
    medicine.alias = input.alias;
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

  await medicine.save();

  return toMedicineView(medicine);
};

/**
 * Physically deletes a medicine from the blister inventory for owners only.
 */
export const medicinesDelete = async (
  blisterId: string,
  medicineId: string,
  blisterRole: BlisterRole,
): Promise<void> => {
  ensureWriterRole(blisterRole, ['OWNER']);

  const medicine = await getMedicineDocument(blisterId, medicineId);
  await medicine.deleteOne();
};
