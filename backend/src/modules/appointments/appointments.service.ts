import { Types } from 'mongoose';

import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
} from '../../constants/http.constants';
import { AppointmentModel } from '../../models/appointment.model';
import { BlisterModel } from '../../models/blister.model';
import { TreatmentModel } from '../../models/treatment.model';
import { type BlisterMember, type BlisterRole } from '../../types/blister.types';
import { AppError } from '../../utils/app-error';
import {
  type AppointmentsListQuery,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '../../../../shared/schemas';

interface AppointmentView {
  id: string;
  blisterId: string;
  patientUserId: string;
  title: string;
  date: Date;
  treatmentId: string | null;
}

interface AppointmentsListResult {
  appointments: AppointmentView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const WRITER_ROLES: BlisterRole[] = ['OWNER', 'CAREGIVER'];

const toAppointmentView = (appointment: Awaited<ReturnType<typeof AppointmentModel.findOne>>): AppointmentView => ({
  id: appointment!._id.toString(),
  blisterId: appointment!.blisterId.toString(),
  patientUserId: appointment!.patientUserId.toString(),
  title: appointment!.title,
  date: appointment!.date,
  treatmentId: appointment!.treatmentId?.toString() ?? null,
});

const ensureWriterRole = (blisterRole: BlisterRole): void => {
  if (!WRITER_ROLES.includes(blisterRole)) {
    throw new AppError({
      code: 'BLISTER_ROLE_FORBIDDEN',
      message: 'Your role does not allow this action.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }
};

const getAppointmentDocument = async (blisterId: string, appointmentId: string) => {
  const appointment = await AppointmentModel.findOne({
    _id: new Types.ObjectId(appointmentId),
    blisterId: new Types.ObjectId(blisterId),
  });

  if (!appointment) {
    throw new AppError({
      code: 'APPOINTMENT_NOT_FOUND',
      message: 'Appointment not found in this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return appointment;
};

const ensureTreatmentBelongsToBlister = async (
  blisterId: string,
  treatmentId?: string,
  patientUserId?: string,
): Promise<void> => {
  if (!treatmentId) {
    return;
  }

  const treatment = await TreatmentModel.findOne({
    _id: new Types.ObjectId(treatmentId),
    blisterId: new Types.ObjectId(blisterId),
  }).lean();

  if (!treatment) {
    throw new AppError({
      code: 'APPOINTMENT_TREATMENT_NOT_FOUND',
      message: 'The linked treatment does not belong to this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  if (patientUserId && treatment.patientUserId.toString() !== patientUserId) {
    throw new AppError({
      code: 'APPOINTMENT_TREATMENT_PATIENT_MISMATCH',
      message: 'The linked treatment belongs to a different patient.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }
};

/**
 * Validates the patient is currently a member of the blister.
 */
const ensurePatientIsBlisterMember = async (
  blisterId: string,
  patientUserId: string,
): Promise<void> => {
  const blister = await BlisterModel.findOne({
    _id: new Types.ObjectId(blisterId),
    deletedAt: null,
  }).lean();

  const isMember = blister?.members?.some(
    (member: BlisterMember) => member.userId.toString() === patientUserId,
  );

  if (!isMember) {
    throw new AppError({
      code: 'APPOINTMENT_PATIENT_NOT_MEMBER',
      message: 'The selected patient is not a member of this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }
};

/**
 * Lists appointments for a blister with standard collection pagination metadata.
 */
export const appointmentsList = async (
  blisterId: string,
  query: AppointmentsListQuery,
): Promise<AppointmentsListResult> => {
  const { page, limit } = query;
  const filter = {
    blisterId: new Types.ObjectId(blisterId),
  };
  const [appointments, total] = await Promise.all([
    AppointmentModel.find(filter)
      .sort({ date: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AppointmentModel.countDocuments(filter),
  ]);

  return {
    appointments: appointments.map((appointment) => toAppointmentView(appointment)),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Creates an appointment in the target blister and optionally links it to a treatment in the same blister.
 */
export const appointmentsCreate = async (
  blisterId: string,
  blisterRole: BlisterRole,
  input: CreateAppointmentInput,
): Promise<AppointmentView> => {
  ensureWriterRole(blisterRole);
  await ensurePatientIsBlisterMember(blisterId, input.patientUserId);
  await ensureTreatmentBelongsToBlister(blisterId, input.treatmentId, input.patientUserId);

  const appointment = await AppointmentModel.create({
    blisterId: new Types.ObjectId(blisterId),
    patientUserId: new Types.ObjectId(input.patientUserId),
    title: input.title,
    date: input.date,
    treatmentId: input.treatmentId ? new Types.ObjectId(input.treatmentId) : null,
  });

  return toAppointmentView(appointment);
};

/**
 * Updates mutable appointment fields in the target blister.
 */
export const appointmentsUpdate = async (
  blisterId: string,
  appointmentId: string,
  blisterRole: BlisterRole,
  input: UpdateAppointmentInput,
): Promise<AppointmentView> => {
  ensureWriterRole(blisterRole);

  const appointment = await getAppointmentDocument(blisterId, appointmentId);

  const nextPatientId =
    input.patientUserId ?? appointment.patientUserId.toString();

  if (input.patientUserId !== undefined) {
    await ensurePatientIsBlisterMember(blisterId, input.patientUserId);
    appointment.patientUserId = new Types.ObjectId(input.patientUserId);
  }

  await ensureTreatmentBelongsToBlister(blisterId, input.treatmentId, nextPatientId);

  if (input.title !== undefined) {
    appointment.title = input.title;
  }

  if (input.date !== undefined) {
    appointment.date = input.date;
  }

  if (input.treatmentId !== undefined) {
    appointment.treatmentId = input.treatmentId ? new Types.ObjectId(input.treatmentId) : null;
  }

  await appointment.save();

  return toAppointmentView(appointment);
};

/**
 * Deletes an appointment in the target blister.
 */
export const appointmentsDelete = async (
  blisterId: string,
  appointmentId: string,
  blisterRole: BlisterRole,
): Promise<void> => {
  ensureWriterRole(blisterRole);

  const appointment = await getAppointmentDocument(blisterId, appointmentId);
  await appointment.deleteOne();
};
