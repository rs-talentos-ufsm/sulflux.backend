import { prisma } from '../../infra/database';
import { AppError } from '../../utils/AppError';
import { CropCycleResponseDTO, SaveSeasonCyclesDTO } from '@lib/shared';

export class CycleService {
  /**
   * Busca ciclos e insumos de um talhão
   */
  public async getByField(fieldId: string): Promise<CropCycleResponseDTO[]> {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new AppError('Talhão não encontrado.', 404);
    }

    const cycles = await prisma.cropCycle.findMany({
      where: { fieldId },
      include: { inputs: true },
      orderBy: { inicio: 'asc' },
    });

    return cycles.map((c) => ({
      id: c.id,
      tipo: c.tipo as any,
      titulo: c.titulo,
      safra: c.safra,
      cultura: c.cultura,
      produtividade: c.produtividade,
      inicio: c.inicio,
      fim: c.fim,
      fieldId: c.fieldId,
      inputs: c.inputs.map((i) => ({
        id: i.id,
        category: i.category,
        product: i.product,
        quantity: i.quantity,
        date: i.date,
        cycleId: i.cycleId,
        createdAt: i.createdAt,
      })),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Salva todas as fases e insumos de uma safra para o talhão
   */
  public async saveSeasonCycles(
    fieldId: string,
    data: SaveSeasonCyclesDTO,
    userId: string,
  ): Promise<CropCycleResponseDTO[]> {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: { property: true },
    });

    if (!field || field.property.ownerId !== userId) {
      throw new AppError(
        'Talhão não encontrado ou acesso não autorizado.',
        404,
      );
    }

    // Remove ciclos anteriores dessa mesma safra para sobrescrever com a nova configuração
    await prisma.cropCycle.deleteMany({
      where: { fieldId, safra: data.safra },
    });

    const createdCycles: CropCycleResponseDTO[] = [];

    for (const c of data.cycles) {
      const created = await prisma.cropCycle.create({
        data: {
          fieldId,
          safra: data.safra,
          tipo: c.tipo as any,
          titulo: c.titulo,
          cultura: c.cultura,
          produtividade: c.produtividade,
          inicio: new Date(c.inicio),
          fim: new Date(c.fim),
          inputs: {
            create: (c.inputs || []).map((inp) => ({
              category: inp.category,
              product: inp.product,
              quantity: inp.quantity,
              date: new Date(inp.date),
            })),
          },
        },
        include: { inputs: true },
      });

      createdCycles.push({
        id: created.id,
        tipo: created.tipo as any,
        titulo: created.titulo,
        safra: created.safra,
        cultura: created.cultura,
        produtividade: created.produtividade,
        inicio: created.inicio,
        fim: created.fim,
        fieldId: created.fieldId,
        inputs: created.inputs.map((i) => ({
          id: i.id,
          category: i.category,
          product: i.product,
          quantity: i.quantity,
          date: i.date,
          cycleId: i.cycleId,
          createdAt: i.createdAt,
        })),
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });
    }

    // Registra evento de monitoramento para a safra configurada
    await prisma.monitoringEvent.create({
      data: {
        propertyId: field.propertyId,
        fieldId: field.id,
        type: 'SEASON',
        title: `Cronograma da Safra ${data.safra} registrado`,
        detail: `${createdCycles.length} ciclo(s) e fases configurados.`,
      },
    });

    // Se o talhão estava aguardando configuração, podemos atualizá-lo para processando ou pronto
    await prisma.field.update({
      where: { id: fieldId },
      data: { status: 'READY' },
    });

    return createdCycles;
  }
}
