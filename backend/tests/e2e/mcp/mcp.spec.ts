import request from 'supertest';

const { Client } = require('@modelcontextprotocol/sdk/client');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

import { createApp } from '../../../src/app';
import { env } from '../../../src/config/env';
import { BlisterModel } from '../../../src/models/blister.model';
import { MedicineModel } from '../../../src/models/medicine.model';
import { TreatmentModel } from '../../../src/models/treatment.model';
import { UserModel } from '../../../src/models/user.model';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../src/modules/auth/_tests_/auth-test.utils';
import { startMcpTestServer } from '../e2e-test.utils';

const app = createApp({
  clientOrigin: 'http://localhost:5173',
  nodeEnv: 'test',
});

describe('MCP e2e', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const createUser = async (suffix: string) =>
    UserModel.create({
      name: `User ${suffix}`,
      username: `user${suffix}`,
      email: `user${suffix}@example.com`,
      password: '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  const createAccessToken = (userId: string): string =>
    require('jsonwebtoken').sign(
      {
        sub: userId,
        type: 'access',
      },
      env.jwtSecret,
      {
        expiresIn: '15m',
      },
    );

  const createMcpToken = async (accessToken: string): Promise<string> => {
    const response = await request(app)
      .post('/api/v1/auth/mcp-token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(201);
    return response.body.data.token as string;
  };

  const parseToolPayload = <TResult>(result: { content?: Array<{ type: string; text?: string }> }): TResult => {
    const text = result.content?.[0]?.text;

    if (!text) {
      throw new Error('Missing MCP tool text payload.');
    }

    return JSON.parse(text) as TResult;
  };

  it('authenticates with mcpToken and exposes only accessible inventory', async () => {
    const owner = await createUser('mcp-owner');
    const other = await createUser('mcp-other');
    const blister = await BlisterModel.create({
      name: 'Casa',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const foreignBlister = await BlisterModel.create({
      name: 'Ajeno',
      members: [{ userId: other._id, role: 'OWNER' }],
    });
    await MedicineModel.create([
      {
        blisterId: blister._id,
        nregist: '600001',
        nombre: 'Accessible',
        pactivos: 'Activo',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '1 mg',
        iconType: 'pill',
        stock: 5,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-01T00:00:00.000Z'),
      },
      {
        blisterId: foreignBlister._id,
        nregist: '600002',
        nombre: 'Hidden',
        pactivos: 'Oculto',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '2 mg',
        iconType: 'pill',
        stock: 7,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-01T00:00:00.000Z'),
      },
    ]);

    const mcpToken = await createMcpToken(createAccessToken(owner._id.toString()));
    const server = await startMcpTestServer();

    const client = new Client({
      name: 'e2e-agent',
      version: '1.0.0',
    });
    const transport = new StreamableHTTPClientTransport(new URL(server.baseUrl), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${mcpToken}`,
        },
      },
    });

    await client.connect(transport);
    const response = await client.callTool({
      name: 'inventory_query',
      arguments: {
        page: 1,
        limit: 20,
      },
    });

    const payload = parseToolPayload<{ items: Array<{ nombre: string }> }>(response);
    const items = payload.items;

    expect(items).toHaveLength(1);
    expect(items[0]?.nombre).toBe('Accessible');

    await client.close();
    await transport.close();
    await server.stop();
  });

  it('registers adherence logs and resolves official sources through MCP tools', async () => {
    const owner = await createUser('mcp-adherence-owner');
    const blister = await BlisterModel.create({
      name: 'Casa',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '700001',
      nombre: 'Amlodipino',
      pactivos: 'Amlodipino',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '5 mg',
      iconType: 'pill',
      stock: 1,
      stockUnit: 'pastillas',
      threshold: 1,
      expDate: new Date('2030-01-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Tension',
      medicines: [{
        medicineId: medicine._id,
        amount: 1,
        firstDoseAt: new Date('2030-01-01T08:00:00.000Z'),
        frequencyHours: 24,
        isRecurring: true,
      }],
      startDate: new Date('2030-01-01T08:00:00.000Z'),
      endDate: null,
      active: true,
    });

    const originalFetch = global.fetch.bind(global);
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation(async (input: unknown, init?: RequestInit) => {
        const url = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : typeof input === 'object' && input !== null && 'url' in input
              ? String((input as { url?: string }).url ?? '')
              : '';

        if (!url.includes('cima.aemps.es')) {
          return originalFetch(input as string | URL | Request, init);
        }

        return new Response(
          JSON.stringify({
            nregistro: '700001',
            nombre: 'Amlodipino',
            pactivos: 'Amlodipino',
            formaFarmaceutica: { nombre: 'COMPRIMIDO' },
            dosis: '5 mg',
            docs: [
              { tipo: 1, url: 'https://cima.example/ft.pdf', secc: true },
              { tipo: 2, url: 'https://cima.example/prospecto.pdf', secc: true },
            ],
            estado: { aut: 1 },
            psum: false,
            notas: false,
            comerc: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }),
    });

    const mcpToken = await createMcpToken(createAccessToken(owner._id.toString()));
    const server = await startMcpTestServer();

    const client = new Client({
      name: 'e2e-agent',
      version: '1.0.0',
    });
    const transport = new StreamableHTTPClientTransport(new URL(server.baseUrl), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${mcpToken}`,
        },
      },
    });

    await client.connect(transport);

    const adherenceResult = await client.callTool({
      name: 'adherence_logger',
      arguments: {
        blisterId: blister._id.toString(),
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
        forced: false,
        notes: 'MCP intake',
      },
    });
    const adherencePayload = parseToolPayload<{ isForced: boolean; stockAfter: number }>(adherenceResult);

    expect(adherencePayload.isForced).toBe(false);
    expect(adherencePayload.stockAfter).toBe(0);

    const sourceResult = await client.callTool({
      name: 'official_source_linker',
      arguments: {
        medicineId: medicine._id.toString(),
      },
    });
    const sourcePayload = parseToolPayload<{
      official: {
        prospectUrl: string | null;
        fichaTecnicaUrl: string | null;
      };
    }>(sourceResult);

    expect(sourcePayload.official.prospectUrl).toBe('https://cima.example/prospecto.pdf');
    expect(sourcePayload.official.fichaTecnicaUrl).toBe('https://cima.example/ft.pdf');

    await client.close();
    await transport.close();
    await server.stop();
  });
});
