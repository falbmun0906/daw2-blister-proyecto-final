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
  atcs?: unknown[];
  principiosActivos?: unknown[];
  conduc?: boolean;
  triangulo?: boolean;
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
  atcs: unknown[];
  principiosActivos: unknown[];
  conduc: boolean;
  triangulo: boolean;
  cimaStatus: {
    estado: 1 | 2 | 3;
    psum: boolean;
    hasAlerts: boolean;
  };
}
