import { type BlisterRole } from '../types/blister.types';

import {
  type AdherenceLoggerInput,
  type AppointmentManagerInput,
  type InventoryQueryInput,
  type OfficialSourceLinkerInput,
  type ScheduleAssistantInput,
  type StockModifierInput,
} from '../../../shared/schemas';

export interface McpBlisterContext {
  blisterId: string;
  blisterName: string;
  role: BlisterRole;
}

export interface McpAuthContext {
  userId: string;
  blisters: McpBlisterContext[];
}

export interface McpToolDefinition<TInput, TResult> {
  name: string;
  description: string;
  run: (context: McpAuthContext, input: TInput) => Promise<TResult>;
}

export interface McpInventoryItem {
  id: string;
  blisterId: string;
  blisterName: string;
  role: BlisterRole;
  nregist: string;
  nombre: string;
  alias: string | null;
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

export interface McpScheduleItem {
  blisterId: string;
  blisterName: string;
  treatmentId: string;
  treatmentTitle: string;
  medicineId: string;
  medicineName: string;
  amount: number;
  nextDoseAt: Date;
}

export interface McpAppointmentItem {
  id: string;
  blisterId: string;
  blisterName: string;
  title: string;
  date: Date;
  treatmentId: string | null;
}

export interface McpOfficialSourceResult {
  medicine: {
    blisterId: string | null;
    blisterName: string | null;
    medicineId: string | null;
    nregist: string;
    nombre: string;
  };
  official: {
    prospectUrl: string | null;
    fichaTecnicaUrl: string | null;
    docs: Array<{
      tipo: number | null;
      url: string;
      secc: boolean | null;
    }>;
  };
}

export interface McpStockModifierResult {
  blisterId: string;
  medicineId: string;
  medicineName: string;
  stockBefore: number;
  stockAfter: number;
  stockStatus: 'ok' | 'low' | 'out';
}

export type McpInventoryQueryTool = McpToolDefinition<InventoryQueryInput, {
  items: McpInventoryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;

export type McpAdherenceLoggerTool = McpToolDefinition<AdherenceLoggerInput, {
  logId: string;
  blisterId: string;
  treatmentId: string;
  medicineId: string;
  timestamp: string;
  isForced: boolean;
  stockAfter: number;
  warning: string | null;
}>;

export type McpStockModifierTool = McpToolDefinition<StockModifierInput, McpStockModifierResult>;

export type McpScheduleAssistantTool = McpToolDefinition<ScheduleAssistantInput, {
  items: McpScheduleItem[];
}>;

export type McpAppointmentManagerTool = McpToolDefinition<AppointmentManagerInput, {
  items: McpAppointmentItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;

export type McpOfficialSourceLinkerTool = McpToolDefinition<OfficialSourceLinkerInput, McpOfficialSourceResult>;
