import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CycleService } from '../../src/modules/cycle/cycle.service';
import { prisma } from '../../src/infra/database';
import { CycleType } from '@lib/shared';

vi.mock('../../src/infra/database', () => ({
  prisma: {
    field: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cropCycle: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    monitoringEvent: {
      create: vi.fn(),
    },
  },
}));

describe('CycleService — Sequência Temporal e Sobreposição de Safras', () => {
  let service: CycleService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CycleService();
  });

  it('deve reordenar automaticamente a sequência dos ciclos com base na data de início e permitir sobreposição', async () => {
    const fieldId = 'f1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
    const userId = 'u1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';

    (prisma.field.findUnique as any).mockResolvedValue({
      id: fieldId,
      propertyId: 'p1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      property: { ownerId: userId },
    });

    (prisma.cropCycle.deleteMany as any).mockResolvedValue({ count: 1 });

    // Mock das criações retornando o objeto salvo
    (prisma.cropCycle.create as any).mockImplementation(({ data }: any) => {
      return Promise.resolve({
        id: 'cycle-uuid-' + data.sequencia,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs:
          data.inputs?.create?.map((inp: any, idx: number) => ({
            id: 'inp-' + idx,
            ...inp,
            cycleId: 'cycle-uuid-' + data.sequencia,
            createdAt: new Date(),
          })) || [],
      });
    });

    (prisma.monitoringEvent.create as any).mockResolvedValue({});
    (prisma.field.update as any).mockResolvedValue({});

    // Passamos o ciclo que começa MAIS TARDE na primeira posição do array
    // e o ciclo que começa MAIS CEDO na segunda posição (com sobreposição de datas)
    const payload = {
      safra: '2024 / 2025',
      permiteSobreposicao: true,
      cycles: [
        {
          tipo: CycleType.Cover,
          titulo: 'Consórcio Entressafra',
          cultura: 'Braquiária',
          inicio: new Date('2025-02-15'), // Data posterior
          fim: new Date('2025-08-30'),
          inputs: [],
        },
        {
          tipo: CycleType.Commercial,
          titulo: 'Safra Principal — Verão',
          cultura: 'Soja',
          inicio: new Date('2024-10-15'), // Data anterior! Deve virar sequencia 1
          fim: new Date('2025-03-20'), // Nota: fim em 2025-03-20 sobrepõe início do ciclo acima (2025-02-15)
          inputs: [
            {
              product: 'NPK 04-14-08',
              category: 'Fertilizante',
              quantity: 250,
              unit: 'kg/ha',
              notes: 'Aplicação no sulco de plantio',
              date: new Date('2024-10-15'),
            },
          ],
        },
      ],
    };

    const result = await service.saveSeasonCycles(fieldId, payload, userId);

    expect(result).toHaveLength(2);
    // O primeiro ciclo retornado deve ser o que tem data de início anterior (2024-10-15)
    expect(result[0].titulo).toBe('Safra Principal — Verão');
    expect(result[0].sequencia).toBe(1);
    expect(result[0].inputs).toHaveLength(1);
    expect(result[0].inputs[0].product).toBe('NPK 04-14-08');
    expect(result[0].inputs[0].quantity).toBe(250);
    expect(result[0].inputs[0].unit).toBe('kg/ha');

    // O segundo ciclo deve ser o de data posterior (2025-02-15)
    expect(result[1].titulo).toBe('Consórcio Entressafra');
    expect(result[1].sequencia).toBe(2);
  });
});
