import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssistantService } from '../../src/modules/assistant/assistant.service';
import { prisma } from '../../src/infra/database';
import { AppError } from '../../src/utils/AppError';

describe('AssistantService', () => {
  let assistantService: AssistantService;

  beforeEach(() => {
    assistantService = new AssistantService();
    vi.restoreAllMocks();
  });

  describe('getContext', () => {
    it('deve rejeitar requisição sem userId', async () => {
      await expect(assistantService.getContext('')).rejects.toThrow(AppError);
    });

    it('deve retornar contexto agronômico do produtor com dados calculados', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'user-uuid-1',
        name: 'Carlos Silva',
        email: 'carlos@sulflux.com',
        ownedProperties: [
          {
            id: 'prop-1',
            name: 'Fazenda Santa Maria',
            location: 'Cruz Alta, RS',
            car: 'RS-4305108-8C646BEA3C084EEBA1C765BB8E09FA83',
            status: 'ACTIVE',
            fields: [
              {
                id: 'field-1',
                name: 'Talhão Soja Norte',
                code: 'T-01',
                area: 120,
                soilType: 'Argiloso',
                status: 'READY',
                cycles: [
                  {
                    id: 'cycle-1',
                    titulo: 'Soja Safra 23/24',
                    safra: 'Safra 23/24',
                    cultura: 'Soja',
                    tipo: 'COMMERCIAL',
                    produtividade: '68 sc/ha',
                    inicio: new Date(),
                    fim: new Date(),
                    inputs: [],
                  },
                ],
                metrics: [
                  {
                    id: 'metric-1',
                    month: 'Nov',
                    year: 2024,
                    gpp: 8.5,
                    reco: 4.9,
                    nee: -3.6,
                    precipitacao: 160.0,
                    aguaSolo: 68.0,
                    limiarCritico: 45.0,
                    ndvi: 0.84,
                    createdAt: new Date(),
                  },
                ],
              },
            ],
            documents: [],
            events: [],
          },
        ],
      } as any);

      const context = await assistantService.getContext('user-uuid-1');

      expect(context.producerName).toBe('Carlos');
      expect(context.organization).toBe('Fazenda Santa Maria');
      expect(context.totalProperties).toBe(1);
      expect(context.readyFieldsCount).toBe(1);
      expect(context.activeSeason).toBe('Safra 23/24');
      expect(context.totalCarbonBalance).toContain('CO2e');
      expect(context.suggestedPrompts.length).toBeGreaterThan(0);
    });
  });

  describe('getMessages e clearMessages', () => {
    it('deve listar mensagens históricas do usuário', async () => {
      vi.spyOn(prisma.assistantMessage, 'findMany').mockResolvedValueOnce([
        {
          id: 'msg-1',
          role: 'user',
          content: 'Como está o carbono?',
          citations: null,
          userId: 'user-uuid-1',
          createdAt: new Date('2026-10-14T10:00:00Z'),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'O balanço de carbono está positivo.',
          citations: [{ label: 'Carbono Positivo', category: 'carbono' }],
          userId: 'user-uuid-1',
          createdAt: new Date('2026-10-14T10:00:05Z'),
        },
      ] as any);

      const messages = await assistantService.getMessages('user-uuid-1');

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].text).toBe('Como está o carbono?');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].citations).toHaveLength(1);
    });

    it('deve limpar histórico de mensagens', async () => {
      const deleteManySpy = vi
        .spyOn(prisma.assistantMessage, 'deleteMany')
        .mockResolvedValueOnce({ count: 5 } as any);

      const result = await assistantService.clearMessages('user-uuid-1');

      expect(deleteManySpy).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('deve processar mensagem e persistir respostas no banco', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Carlos Silva',
        email: 'carlos@sulflux.com',
        ownedProperties: [],
      } as any);

      vi.spyOn(prisma.assistantMessage, 'findMany').mockResolvedValue([]);

      const createSpy = vi
        .spyOn(prisma.assistantMessage, 'create')
        .mockImplementation(async (args: any) => {
          return {
            id: 'created-id-123',
            role: args.data.role,
            content: args.data.content,
            citations: args.data.citations,
            userId: args.data.userId,
            createdAt: new Date(),
          } as any;
        });

      const response = await assistantService.sendMessage(
        'Como está o balanço de carbono?',
        'user-uuid-1',
      );

      expect(createSpy).toHaveBeenCalledTimes(2); // 1 para mensagem do user, 1 para assistant
      expect(response.role).toBe('assistant');
      expect(response.text.length).toBeGreaterThan(10);
      expect(response.citations?.length).toBeGreaterThan(0);
    });
  });
});
