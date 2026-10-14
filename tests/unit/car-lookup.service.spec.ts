import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CarLookupService } from '../../src/modules/property/car-lookup.service';
import { prisma } from '../../src/infra/database';
import { AppError } from '../../src/utils/AppError';

describe('CarLookupService', () => {
  let carLookupService: CarLookupService;

  beforeEach(() => {
    carLookupService = new CarLookupService();
    vi.restoreAllMocks();
  });

  it('deve rejeitar CAR com formato inválido', async () => {
    // Menos de 43 caracteres ou padrão errado
    await expect(carLookupService.lookup('RS-1234-ABCD')).rejects.toThrow(
      AppError,
    );
    await expect(carLookupService.lookup('RS-1234-ABCD')).rejects.toThrow(
      /Número do CAR inválido/,
    );
  });

  it('deve rejeitar CAR com código IBGE incorreto (não numérico ou tamanho errado)', async () => {
    await expect(
      carLookupService.lookup('RS-430510-8C646BEA3C084EEBA1C765BB8E09FA83'),
    ).rejects.toThrow(/Número do CAR inválido/);
  });

  it('deve rejeitar CAR com hash diferente de 32 caracteres hexadecimais', async () => {
    await expect(
      carLookupService.lookup('RS-4305108-8C646BEA3C084EEBA1C765BB8E09FA8'),
    ).rejects.toThrow(/Número do CAR inválido/);
  });

  it('deve retornar erro 409 se o CAR já estiver cadastrado no banco', async () => {
    vi.spyOn(prisma.property, 'findUnique').mockResolvedValueOnce({
      id: 'mock-uuid',
      name: 'Fazenda Existente',
      location: 'Cruz Alta, RS',
      car: 'RS-4305108-8C646BEA3C084EEBA1C765BB8E09FA83',
      area: 500,
      fiscalModules: 14.2,
      ownerName: 'Proprietário Existente',
      coordinates: null,
      status: 'ACTIVE',
      ownerId: 'user-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(
      carLookupService.lookup('RS-4305108-8C646BEA3C084EEBA1C765BB8E09FA83'),
    ).rejects.toThrow(/já está cadastrado no sistema/);
  });

  it('deve consultar com sucesso um CAR válido e retornar metadados corretos de Cruz Alta', async () => {
    vi.spyOn(prisma.property, 'findUnique').mockResolvedValueOnce(null);

    const validCar = 'RS-4305108-8C646BEA3C084EEBA1C765BB8E09FA83';
    const result = await carLookupService.lookup(validCar);

    expect(result).toBeDefined();
    expect(result.car).toBe(validCar);
    expect(result.municipality).toBe('Cruz Alta');
    expect(result.state).toBe('RS');
    expect(result.location).toBe('Cruz Alta, RS');
    expect(result.ibgeCode).toBe('4305108');
    expect(result.area).toBeGreaterThan(0);
    expect(result.fiscalModules).toBeGreaterThan(0);
    expect(result.name).toBeTruthy();
    expect(result.ownerName).toBeTruthy();
    expect(result.status).toBe('Ativo');
    expect(result.coordinates.length).toBeGreaterThanOrEqual(4);
  });

  it('deve consultar com sucesso um CAR de Santa Maria e calcular módulos fiscais com base no módulo da região', async () => {
    vi.spyOn(prisma.property, 'findUnique').mockResolvedValueOnce(null);

    const santaMariaCar = 'RS-4316907-8821B0912A314B5C8D7E9F0A1B2C3D4E';
    const result = await carLookupService.lookup(santaMariaCar);

    expect(result.municipality).toBe('Santa Maria');
    expect(result.state).toBe('RS');
    expect(result.ibgeCode).toBe('4316907');
    // Módulo fiscal de Santa Maria é 20ha
    expect(result.fiscalModules).toBeCloseTo(result.area / 20, 1);
  });
});
