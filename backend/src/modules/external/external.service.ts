import { env } from '../../config/env';
import {
  HTTP_STATUS_BAD_GATEWAY,
  HTTP_STATUS_NOT_FOUND,
} from '../../constants/http.constants';
import { AppError } from '../../utils/app-error';
import {
  type CimaApiItem,
  type CimaRegistroCambiosItem,
  type CimaApiState,
  type ExternalMedicineInfo,
  type ExternalSearchItem,
} from './external.types';

const normalizeCimaResponse = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const entries = payload as { resultados?: unknown; resultadosFiltrados?: unknown };

    if (Array.isArray(entries.resultados)) {
      return entries.resultados as T[];
    }

    if (Array.isArray(entries.resultadosFiltrados)) {
      return entries.resultadosFiltrados as T[];
    }
  }

  return [];
};

const buildCimaUrl = (pathname: string, searchParams: Record<string, string>): string => {
  const url = new URL(pathname.replace(/^\//, ''), `${env.cimaBaseUrl.replace(/\/$/, '')}/`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

const fetchCimaJson = async <T>(pathname: string, searchParams: Record<string, string>): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(buildCimaUrl(pathname, searchParams), {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new AppError({
      code: 'CIMA_UNAVAILABLE',
      message: 'CIMA service is currently unavailable.',
      statusCode: HTTP_STATUS_BAD_GATEWAY,
    });
  }

  if (!response.ok) {
    throw new AppError({
      code: 'CIMA_UNAVAILABLE',
      message: 'CIMA service returned an unexpected response.',
      statusCode: HTTP_STATUS_BAD_GATEWAY,
    });
  }

  return (await response.json()) as T;
};

const toCimaEstado = (estado?: CimaApiState): 1 | 2 | 3 => {
  if (estado?.rev) {
    return 3;
  }

  if (estado?.susp) {
    return 2;
  }

  return 1;
};

const toSearchItem = (medicine: CimaApiItem): ExternalSearchItem | null => {
  if (!medicine.nregistro || !medicine.nombre) {
    return null;
  }

  return {
    nregist: medicine.nregistro,
    nombre: medicine.nombre,
    pactivos: medicine.pactivos ?? '',
    labtitular: medicine.labtitular ?? null,
    formaOficial: medicine.formaFarmaceutica?.nombre ?? null,
    dosisOficial: medicine.dosis ?? null,
  };
};

const toMedicineInfo = (medicine: CimaApiItem): ExternalMedicineInfo => {
  const cimaStatus = {
    estado: toCimaEstado(medicine.estado),
    psum: medicine.psum ?? false,
    hasAlerts: Boolean(medicine.psum || medicine.notas),
    comerc: medicine.comerc ?? false,
    notas: medicine.notas ?? false,
    materialesInf: medicine.materialesInf ?? false,
  };

  const atcs = (medicine.atcs ?? [])
    .filter((a) => a && (a.nombre || a.codigo))
    .map((a) => ({
      codigo: a.codigo?.toString().trim() || null,
      nombre: (a.nombre ?? '').toString().trim(),
    }));

  const principiosActivos = (medicine.principiosActivos ?? [])
    .filter((p) => p && p.nombre)
    .map((p) => ({
      nombre: (p.nombre ?? '').toString().trim(),
      cantidad: p.cantidad != null ? p.cantidad.toString().trim() : null,
      unidad: p.unidad ? p.unidad.toString().trim() : null,
    }));

  const excipientes = (medicine.excipientes ?? [])
    .filter((e) => e && e.nombre)
    .map((e) => ({ nombre: (e.nombre ?? '').toString().trim() }));

  const viasSource = medicine.viasAdministracion ?? medicine.vtas ?? [];
  const viasAdministracion = viasSource
    .filter((v) => v && v.nombre)
    .map((v) => ({ nombre: (v.nombre ?? '').toString().trim() }));

  const fechaAutorizacion = medicine.fechaAutorizacion
    ? new Date(medicine.fechaAutorizacion).toISOString()
    : null;

  return {
    nregist: medicine.nregistro ?? '',
    nombre: medicine.nombre ?? '',
    pactivos: medicine.pactivos ?? '',
    labtitular: medicine.labtitular ?? null,
    formaOficial: medicine.formaFarmaceutica?.nombre ?? null,
    formaSimplificada: medicine.formaFarmaceuticaSimplificada?.nombre ?? null,
    dosisOficial: medicine.dosis ?? null,
    comerc: medicine.comerc ?? false,
    psum: medicine.psum ?? false,
    notas: medicine.notas ?? false,
    materialesInf: medicine.materialesInf ?? false,
    docs: medicine.docs ?? [],
    fotos: medicine.fotos ?? [],
    atcs,
    principiosActivos,
    excipientes,
    viasAdministracion,
    cpresc: medicine.cpresc ? medicine.cpresc.toString().trim() : null,
    receta: medicine.receta ?? false,
    fechaAutorizacion,
    conduc: medicine.conduc ?? false,
    triangulo: medicine.triangulo ?? false,
    cimaStatus,
  };
};

/**
 * Searches authorized and marketed medicines in CIMA by a free-text name query.
 */
export const externalSearchMedicines = async (query: string): Promise<ExternalSearchItem[]> => {
  const payload = await fetchCimaJson<unknown>('/medicamentos', {
    nombre: query,
    comerc: '1',
    autorizados: '1',
  });

  return normalizeCimaResponse<CimaApiItem>(payload)
    .map(toSearchItem)
    .filter((item): item is ExternalSearchItem => item !== null);
};

/**
 * Retrieves the official CIMA medicine record by nregistro.
 */
export const externalGetMedicineInfo = async (nregist: string): Promise<ExternalMedicineInfo> => {
  const payload = await fetchCimaJson<unknown>('/medicamento', {
    nregistro: nregist,
  });

  const medicine = normalizeCimaResponse<CimaApiItem>(payload)[0] ?? (payload as CimaApiItem | null);

  if (!medicine?.nregistro) {
    throw new AppError({
      code: 'CIMA_MEDICINE_NOT_FOUND',
      message: 'Medicine not found in CIMA.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return toMedicineInfo(medicine);
};

/**
 * Retrieves the incremental CIMA change registry from the requested dd/mm/yyyy date.
 */
export const externalGetRegistroCambios = async (
  fecha: string,
): Promise<CimaRegistroCambiosItem[]> => {
  const payload = await fetchCimaJson<unknown>('/registroCambios', {
    fecha,
  });

  return normalizeCimaResponse<CimaRegistroCambiosItem>(payload);
};
