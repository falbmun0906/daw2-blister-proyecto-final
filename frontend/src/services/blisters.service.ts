import {
  createBlisterSchema,
  createInviteSchema,
  joinBlisterSchema,
  updateBlisterSchema,
  updateMemberRoleSchema,
  type CreateBlisterInput,
  type CreateInviteInput,
  type JoinBlisterInput,
  type UpdateBlisterInput,
  type UpdateMemberRoleInput,
} from '../../../shared/schemas/blister.schema';

import { apiClient, normalizeApiResponse } from './api.client';
import type {
  Blister,
  BlisterMemberDetail,
  InviteCode,
} from '../types/blister.types';

/** Lista los blísters activos del usuario autenticado. */
export async function listBlisters(): Promise<Blister[]> {
  const response = await apiClient.get('/blisters');
  return normalizeApiResponse<Blister[]>(response);
}

/** Crea un nuevo blíster (el creador queda como OWNER). */
export async function createBlister(input: CreateBlisterInput): Promise<Blister> {
  const payload = createBlisterSchema.parse(input);
  const response = await apiClient.post('/blisters', payload);
  return normalizeApiResponse<Blister>(response);
}

/** Renombra un blíster. Requiere rol OWNER. */
export async function updateBlister(id: string, input: UpdateBlisterInput): Promise<Blister> {
  const payload = updateBlisterSchema.parse(input);
  const response = await apiClient.patch(`/blisters/${id}`, payload);
  return normalizeApiResponse<Blister>(response);
}

/** Borrado lógico de un blíster. Requiere rol OWNER. */
export async function softDeleteBlister(id: string): Promise<{ id: string }> {
  const response = await apiClient.delete(`/blisters/${id}`);
  return normalizeApiResponse<{ id: string }>(response);
}

/** Genera un código de invitación con un rol concreto. */
export async function createInvite(id: string, input: CreateInviteInput): Promise<InviteCode> {
  const payload = createInviteSchema.parse(input);
  const response = await apiClient.post(`/blisters/${id}/invite`, payload);
  return normalizeApiResponse<InviteCode>(response);
}

/** Une al usuario actual a un blíster mediante código de invitación. */
export async function joinBlister(input: JoinBlisterInput): Promise<Blister> {
  const payload = joinBlisterSchema.parse(input);
  const response = await apiClient.post('/blisters/join', payload);
  return normalizeApiResponse<Blister>(response);
}

/** Lista los miembros del blíster con datos de usuario expandidos. */
export async function listBlisterMembers(id: string): Promise<BlisterMemberDetail[]> {
  const response = await apiClient.get(`/blisters/${id}/members`);
  return normalizeApiResponse<BlisterMemberDetail[]>(response);
}

/** Expulsa a un miembro o permite al usuario abandonar el blíster. */
export async function removeBlisterMember(id: string, memberId: string): Promise<{ id: string }> {
  const response = await apiClient.delete(`/blisters/${id}/members/${memberId}`);
  return normalizeApiResponse<{ id: string }>(response);
}

/** Cambia el rol de un miembro. Requiere rol OWNER. */
export async function updateBlisterMemberRole(
  id: string,
  memberId: string,
  input: UpdateMemberRoleInput,
): Promise<BlisterMemberDetail> {
  const payload = updateMemberRoleSchema.parse(input);
  const response = await apiClient.patch(`/blisters/${id}/members/${memberId}/role`, payload);
  return normalizeApiResponse<BlisterMemberDetail>(response);
}
