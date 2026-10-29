import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import { CropCycleResponseDTO, SaveSeasonCyclesDTO } from '@lib/shared';

export class CycleService {
  /**
   * Busca ciclos e insumos de um talhão ordenados cronologicamente
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
      include: {
        inputs: {
          orderBy: { date: 'asc' },
        },
      },
      orderBy: [{ inicio: 'asc' }, { sequencia: 'asc' }],
    });

    return cycles.map((c) => ({
      id: c.id,
      tipo: c.tipo as any,
      titulo: c.titulo,
      safra: c.safra,
      cultura: c.cultura,
      produtividade: c.produtividade,
      sequencia: c.sequencia,
      inicio: c.inicio,
      fim: c.fim,
      fieldId: c.fieldId,
      inputs: c.inputs.map((i) => ({
        id: i.id,
        category: i.category,
        product: i.product,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
        date: i.date,
        cycleId: i.cycleId,
        createdAt: i.createdAt,
      })),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Salva todas as fases e insumos de uma safra para o talhão.
   * A data de início de cada fase ajusta automaticamente a sequência das safras,
   * permitindo expressamente a sobreposição de datas entre fases e safras.
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

    // Ordena os ciclos automaticamente pela data de início (ajusta a sequência cronológica das safras)
    // Permite sobreposição de datas entre fases e ciclos
    const sortedCycles = [...data.cycles].sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    );

    // Remove ciclos anteriores dessa mesma safra para sobrescrever com a nova configuração
    await prisma.cropCycle.deleteMany({
      where: { fieldId, safra: data.safra },
    });

    const createdCycles: CropCycleResponseDTO[] = [];

    for (let index = 0; index < sortedCycles.length; index++) {
      const c = sortedCycles[index];
      const sequencia = index + 1;

      const created = await prisma.cropCycle.create({
        data: {
          fieldId,
          safra: data.safra,
          tipo: c.tipo as any,
          titulo: c.titulo,
          cultura: c.cultura,
          produtividade: c.produtividade,
          sequencia,
          inicio: new Date(c.inicio),
          fim: new Date(c.fim),
          inputs: {
            create: (c.inputs || []).map((inp) => ({
              category: inp.category,
              product: inp.product,
              quantity: Number(inp.quantity),
              unit: inp.unit || 'kg/ha',
              notes: inp.notes || null,
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
        sequencia: created.sequencia,
        inicio: created.inicio,
        fim: created.fim,
        fieldId: created.fieldId,
        inputs: created.inputs.map((i) => ({
          id: i.id,
          category: i.category,
          product: i.product,
          quantity: i.quantity,
          unit: i.unit,
          notes: i.notes,
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
        detail: `${createdCycles.length} ciclo(s) configurados em sequência temporal.`,
      },
    });

    // Atualiza status do talhão para READY
    await prisma.field.update({
      where: { id: fieldId },
      data: { status: 'READY' },
    });

    return createdCycles;
  }
}
