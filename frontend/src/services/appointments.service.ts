import {
  appointmentSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  type Appointment,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '../../../shared/schemas/appointment.schema';

import { apiClient, normalizeApiResponse } from './api.client';

interface ListOptions {
  page?: number;
  limit?: number;
}

/** Lista las citas del blíster activo. */
export async function listAppointments(
  blisterId: string,
  options: ListOptions = {},
): Promise<Appointment[]> {
  const { page = 1, limit = 100 } = options;
  const response = await apiClient.get(`/blisters/${blisterId}/appointments`, {
    params: { page, limit },
  });
  const raw = normalizeApiResponse<unknown[]>(response);
  return raw.map((item) => appointmentSchema.parse(item));
}

/** Crea una cita. Requiere OWNER o CAREGIVER. */
export async function createAppointment(
  blisterId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const payload = createAppointmentSchema.parse(input);
  const response = await apiClient.post(`/blisters/${blisterId}/appointments`, payload);
  return appointmentSchema.parse(normalizeApiResponse(response));
}

/** Actualiza una cita existente. */
export async function updateAppointment(
  blisterId: string,
  appointmentId: string,
  input: UpdateAppointmentInput,
): Promise<Appointment> {
  const payload = updateAppointmentSchema.parse(input);
  const response = await apiClient.patch(
    `/blisters/${blisterId}/appointments/${appointmentId}`,
    payload,
  );
  return appointmentSchema.parse(normalizeApiResponse(response));
}

/** Elimina una cita. */
export async function removeAppointment(
  blisterId: string,
  appointmentId: string,
): Promise<void> {
  await apiClient.delete(`/blisters/${blisterId}/appointments/${appointmentId}`);
}
