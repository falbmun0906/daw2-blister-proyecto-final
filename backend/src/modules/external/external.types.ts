export interface CimaDocumentReference {
  tipo?: number;
  url?: string;
  secc?: boolean;
}

export interface CimaPhotoReference {
  url?: string;
  tipo?: string;
}

export interface CimaApiState {
  aut?: number | string | null;
  susp?: number | string | null;
  rev?: number | string | null;
}

export interface CimaNamedEntry {
  codigo?: string;
  nombre?: string;
  cantidad?: number | string;
  unidad?: string;
  orden?: number;
}

export interface CimaApiItem {
  nregistro?: string;
  nombre?: string;
  pactivos?: string;
  labtitular?: string;
  formaFarmaceutica?: {
    nombre?: string;
  };
  formaFarmaceuticaSimplificada?: {
    nombre?: string;
  };
  dosis?: string;
  estado?: CimaApiState;
  psum?: boolean;
  notas?: boolean;
  materialesInf?: boolean;
  docs?: CimaDocumentReference[];
  fotos?: CimaPhotoReference[];
  comerc?: boolean;
  atcs?: CimaNamedEntry[];
  principiosActivos?: CimaNamedEntry[];
  excipientes?: CimaNamedEntry[];
  viasAdministracion?: CimaNamedEntry[];
  vtas?: CimaNamedEntry[];
  cpresc?: string;
  receta?: boolean;
  fechaAutorizacion?: number | null;
  conduc?: boolean;
  triangulo?: boolean;
}

export interface CimaRegistroCambiosItem {
  nregistro?: string;
  fecha?: number | string | null;
  tipoCambio?: number | null;
  cambios?: string[];
}

export interface ExternalSearchItem {
  nregist: string;
  nombre: string;
  pactivos: string;
  labtitular: string | null;
  formaOficial: string | null;
  dosisOficial: string | null;
}

export interface ExternalMedicineInfo {
  nregist: string;
  nombre: string;
  pactivos: string;
  labtitular: string | null;
  formaOficial: string | null;
  formaSimplificada: string | null;
  dosisOficial: string | null;
  comerc: boolean;
  psum: boolean;
  notas: boolean;
  materialesInf: boolean;
  docs: CimaDocumentReference[];
  fotos: CimaPhotoReference[];
  atcs: { codigo: string | null; nombre: string }[];
  principiosActivos: { nombre: string; cantidad: string | null; unidad: string | null }[];
  excipientes: { nombre: string }[];
  viasAdministracion: { nombre: string }[];
  cpresc: string | null;
  receta: boolean;
  fechaAutorizacion: string | null;
  conduc: boolean;
  triangulo: boolean;
  cimaStatus: {
    estado: 1 | 2 | 3;
    psum: boolean;
    hasAlerts: boolean;
    comerc: boolean;
    notas: boolean;
    materialesInf: boolean;
  };
}
