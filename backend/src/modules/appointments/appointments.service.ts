import { Types } from 'mongoose';

import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
} from '../../constants/http.constants';
import { AppointmentModel } from '../../models/appointment.model';
import { BlisterModel } from '../../models/blister.model';
import { TreatmentModel } from '../../models/treatment.model';
import { UserModel } from '../../models/user.model';
import {
  type AppointmentCommentDocument,
  type AppointmentDocument,
} from '../../types/appointment.types';
import { type BlisterMember, type BlisterRole } from '../../types/blister.types';
import { AppError } from '../../utils/app-error';
import { notifyAppointmentComment } from '../notifications/notifications.service';
import {
  type AppointmentCommentInput,
  type AppointmentsListQuery,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '../../../../shared/schemas';

interface AppointmentCommentView {
  id: string;
  userId: string;
  authorName: string;
  authorAvatarKey: string | null;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AppointmentView {
  id: string;
  blisterId: string;
  patientUserId: string;
  title: string;
  location: string | null;
  description: string | null;
  date: Date;
  treatmentId: string | null;
  comments: AppointmentCommentView[];
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
const FALLBACK_COMMENT_AUTHOR_NAME = 'Miembro del blister';

interface CommentAuthorView {
  name: string;
  avatarKey: string | null;
}

interface LeanCommentAuthor {
  _id: Types.ObjectId;
  name?: string;
  settings?: {
    avatarKey?: string;
  };
}

const toAppointmentCommentView = (
  comment: AppointmentCommentDocument,
  authors: Map<string, CommentAuthorView>,
): AppointmentCommentView => {
  const userId = comment.userId.toString();
  const author = authors.get(userId);

  return {
    id: comment._id.toString(),
    userId,
    authorName: author?.name ?? FALLBACK_COMMENT_AUTHOR_NAME,
    authorAvatarKey: author?.avatarKey ?? null,
    text: comment.text,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
};

const toAppointmentView = (
  appointment: AppointmentDocument,
  authors = new Map<string, CommentAuthorView>(),
): AppointmentView => ({
  id: appointment._id.toString(),
  blisterId: appointment.blisterId.toString(),
  patientUserId: appointment.patientUserId.toString(),
  title: appointment.title,
  location: appointment.location ?? null,
  description: appointment.description ?? null,
  date: appointment.date,
  treatmentId: appointment.treatmentId?.toString() ?? null,
  comments: appointment.comments.map((comment) => toAppointmentCommentView(comment, authors)),
});

const buildCommentAuthorMap = async (
  appointments: AppointmentDocument[],
): Promise<Map<string, CommentAuthorView>> => {
  const authorIds = [
    ...new Set(
      appointments.flatMap((appointment) =>
        appointment.comments.map((comment) => comment.userId.toString()),
      ),
    ),
  ];

  if (authorIds.length === 0) {
    return new Map();
  }

  const users = await UserModel.find({
    _id: { $in: authorIds.map((id) => new Types.ObjectId(id)) },
  })
    .select('name settings.avatarKey')
    .lean<LeanCommentAuthor[]>();

  return new Map(
    users.map((user) => [
      user._id.toString(),
      {
        name: user.name ?? FALLBACK_COMMENT_AUTHOR_NAME,
        avatarKey: user.settings?.avatarKey ?? null,
      },
    ]),
  );
};

const toAppointmentViewWithAuthors = async (
  appointment: AppointmentDocument,
): Promise<AppointmentView> => {
  const authors = await buildCommentAuthorMap([appointment]);
  return toAppointmentView(appointment, authors);
};

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

const getAppointmentComment = (
  appointment: AppointmentDocument,
  commentId: string,
): AppointmentCommentDocument => {
  const comment = appointment.comments.find((item) => item._id.toString() === commentId);

  if (!comment) {
    throw new AppError({
      code: 'APPOINTMENT_COMMENT_NOT_FOUND',
      message: 'Appointment comment not found.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return comment;
};

const ensureCommentMutationAllowed = (
  comment: AppointmentCommentDocument,
  userId: string,
  blisterRole: BlisterRole,
): void => {
  if (comment.userId.toString() === userId || blisterRole === 'OWNER') {
    return;
  }

  throw new AppError({
    code: 'APPOINTMENT_COMMENT_FORBIDDEN',
    message: 'You can only edit or delete your own comments.',
    statusCode: HTTP_STATUS_FORBIDDEN,
  });
};

const ensureTreatmentBelongsToBlister = async (
  blisterId: string,
  treatmentId?: string | null,
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
  const authors = await buildCommentAuthorMap(appointments);

  return {
    appointments: appointments.map((appointment) => toAppointmentView(appointment, authors)),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Gets one appointment in a blister, including comment author metadata.
 */
export const appointmentsGet = async (
  blisterId: string,
  appointmentId: string,
): Promise<AppointmentView> => {
  const appointment = await getAppointmentDocument(blisterId, appointmentId);
  return toAppointmentViewWithAuthors(appointment);
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
    location: input.location ?? null,
    description: input.description ?? null,
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

  const treatmentIdToValidate = input.treatmentId !== undefined
    ? input.treatmentId
    : appointment.treatmentId?.toString() ?? null;

  await ensureTreatmentBelongsToBlister(blisterId, treatmentIdToValidate, nextPatientId);

  if (input.title !== undefined) {
    appointment.title = input.title;
  }

  if (input.location !== undefined) {
    appointment.location = input.location ?? null;
  }

  if (input.description !== undefined) {
    appointment.description = input.description ?? null;
  }

  if (input.date !== undefined) {
    appointment.date = input.date;
  }

  if (input.treatmentId !== undefined) {
    appointment.treatmentId = input.treatmentId ? new Types.ObjectId(input.treatmentId) : null;
  }

  await appointment.save();

  return toAppointmentViewWithAuthors(appointment);
};

/**
 * Adds a comment to an appointment in the target blister.
 */
export const appointmentsAddComment = async (
  blisterId: string,
  appointmentId: string,
  userId: string,
  blisterRole: BlisterRole,
  input: AppointmentCommentInput,
): Promise<AppointmentView> => {
  ensureWriterRole(blisterRole);

  const appointment = await getAppointmentDocument(blisterId, appointmentId);
  const now = new Date();
  const comment: AppointmentCommentDocument = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(userId),
    text: input.text,
    createdAt: now,
    updatedAt: now,
  };

  appointment.comments.push(comment);

  await appointment.save();

  const blister = await BlisterModel.findOne({
    _id: new Types.ObjectId(blisterId),
    deletedAt: null,
  });

  if (blister) {
    await notifyAppointmentComment(appointment, blister, comment);
  }

  return toAppointmentViewWithAuthors(appointment);
};

/**
 * Updates a comment when the caller is its author or owns the blister.
 */
export const appointmentsUpdateComment = async (
  blisterId: string,
  appointmentId: string,
  commentId: string,
  userId: string,
  blisterRole: BlisterRole,
  input: AppointmentCommentInput,
): Promise<AppointmentView> => {
  ensureWriterRole(blisterRole);

  const appointment = await getAppointmentDocument(blisterId, appointmentId);
  const comment = getAppointmentComment(appointment, commentId);
  ensureCommentMutationAllowed(comment, userId, blisterRole);

  comment.text = input.text;
  comment.updatedAt = new Date();

  await appointment.save();

  return toAppointmentViewWithAuthors(appointment);
};

/**
 * Deletes a comment when the caller is its author or owns the blister.
 */
export const appointmentsDeleteComment = async (
  blisterId: string,
  appointmentId: string,
  commentId: string,
  userId: string,
  blisterRole: BlisterRole,
): Promise<AppointmentView> => {
  ensureWriterRole(blisterRole);

  const appointment = await getAppointmentDocument(blisterId, appointmentId);
  const comment = getAppointmentComment(appointment, commentId);
  ensureCommentMutationAllowed(comment, userId, blisterRole);

  appointment.comments = appointment.comments.filter(
    (item: AppointmentCommentDocument) => item._id.toString() !== commentId,
  );
  await appointment.save();

  return toAppointmentViewWithAuthors(appointment);
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
