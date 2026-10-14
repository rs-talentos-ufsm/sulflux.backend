import { prisma } from '../../infra/database';
import { AppError } from '../../utils/AppError';
import {
  CarbonAnalysisResponseDTO,
  WaterAnalysisResponseDTO,
  PropertyMonitoringHistoryDTO,
  TalhaoResultsResponseDTO,
  MapExplorerResponseDTO,
  MonitoringEventType,
} from '@lib/shared';

export class MonitoringService {
  /**
   * Obtém a análise de carbono para um talhão (Eddy Covariance e Sentinel-2A)
   */
  public async getCarbonAnalysis(
    fieldId: string,
    safra: string = '2023 / 2024',
  ): Promise<CarbonAnalysisResponseDTO> {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: { property: true },
    });

    if (!field) {
      throw new AppError('Talhão não encontrado.', 404);
    }

    // Busca métricas persistidas no banco para este talhão
    let metrics = await prisma.fieldMetric.findMany({
      where: { fieldId },
      orderBy: { createdAt: 'asc' },
    });

    // Se ainda não houver métricas geradas para este talhão, semeamos os dados de sensoriamento do talhão
    if (metrics.length === 0) {
      const defaultMonths = [
        {
          month: 'Set',
          gpp: 4.2,
          reco: 3.1,
          nee: -1.1,
          precipitacao: 122,
          aguaSolo: 78,
          ndvi: 0.45,
        },
        {
          month: 'Out',
          gpp: 6.8,
          reco: 3.6,
          nee: -3.2,
          precipitacao: 96,
          aguaSolo: 72,
          ndvi: 0.58,
        },
        {
          month: 'Nov',
          gpp: 8.4,
          reco: 4.0,
          nee: -4.4,
          precipitacao: 64,
          aguaSolo: 61,
          ndvi: 0.72,
        },
        {
          month: 'Dez',
          gpp: 7.1,
          reco: 4.6,
          nee: -2.5,
          precipitacao: 38,
          aguaSolo: 52,
          ndvi: 0.81,
        },
        {
          month: 'Jan',
          gpp: 4.0,
          reco: 5.2,
          nee: 1.2,
          precipitacao: 22,
          aguaSolo: 41,
          ndvi: 0.75,
        },
        {
          month: 'Fev',
          gpp: 3.2,
          reco: 5.0,
          nee: 1.8,
          precipitacao: 15,
          aguaSolo: 34,
          ndvi: 0.68,
        },
        {
          month: 'Mar',
          gpp: 5.6,
          reco: 4.4,
          nee: -1.2,
          precipitacao: 48,
          aguaSolo: 44,
          ndvi: 0.62,
        },
        {
          month: 'Abr',
          gpp: 7.2,
          reco: 3.8,
          nee: -3.4,
          precipitacao: 88,
          aguaSolo: 58,
          ndvi: 0.74,
        },
        {
          month: 'Mai',
          gpp: 6.0,
          reco: 3.2,
          nee: -2.8,
          precipitacao: 134,
          aguaSolo: 70,
          ndvi: 0.79,
        },
      ];

      for (const m of defaultMonths) {
        await prisma.fieldMetric.create({
          data: {
            fieldId,
            month: m.month,
            gpp: m.gpp,
            reco: m.reco,
            nee: m.nee,
            precipitacao: m.precipitacao,
            aguaSolo: m.aguaSolo,
            ndvi: m.ndvi,
            limiarCritico: 45.0,
          },
        });
      }

      metrics = await prisma.fieldMetric.findMany({
        where: { fieldId },
        orderBy: { createdAt: 'asc' },
      });
    }

    const series = metrics.map((m) => ({
      mes: m.month,
      gpp: Number(m.gpp.toFixed(1)),
      reco: Number(m.reco.toFixed(1)),
      nee: Number(m.nee.toFixed(1)),
    }));

    const gppTotal = Number(
      series.reduce((acc, curr) => acc + curr.gpp, 0).toFixed(1),
    );
    const recoTotal = Number(
      series.reduce((acc, curr) => acc + curr.reco, 0).toFixed(1),
    );
    const neeTotal = Number(
      series.reduce((acc, curr) => acc + curr.nee, 0).toFixed(1),
    );

    // Grade de calor de sensoriamento remoto Sentinel-2A (8x12)
    const gridHeatmap: number[][] = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => {
        const base = Math.sin((r + 1) / 3) * Math.cos((c + 1) / 4);
        return Number(Math.min(1, Math.max(0, 0.5 + base * 0.5)).toFixed(2));
      }),
    );

    const insights = [
      {
        title: 'Intensidade de pastejo e biomassa',
        tone: 'warn' as const,
        text: 'A carga animal acima de 2,4 UA/ha em janeiro reduziu o índice foliar e derrubou o GPP, tornando o talhão fonte de carbono temporária.',
      },
      {
        title: 'Condições climáticas sazonais',
        tone: 'info' as const,
        text: 'O déficit hídrico estival elevou a Reco relativa ao GPP. Com o retorno das chuvas outonais, o ecossistema retornou à condição de sumidouro líquido.',
      },
      {
        title: 'Recomendação agronômica',
        tone: 'good' as const,
        text: 'Ajustar o rodízio de piquetes e manter a cobertura aveia+nabo pode ampliar o sequestro líquido anual em até 18%.',
      },
    ];

    return {
      safra,
      fieldId: field.id,
      fieldName: field.name,
      propertyName: field.property.name,
      series,
      kpis: {
        gppTotal,
        recoTotal,
        neeTotal,
        sequestroLiquido: `${neeTotal < 0 ? '+' : '-'}${Math.abs(neeTotal * 1.5).toFixed(1)} t CO2e`,
      },
      gridHeatmap,
      insights,
    };
  }

  /**
   * Obtém a análise hídrica de um talhão
   */
  public async getWaterAnalysis(
    fieldId: string,
    safra: string = '2023 / 2024',
  ): Promise<WaterAnalysisResponseDTO> {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: { property: true },
    });

    if (!field) {
      throw new AppError('Talhão não encontrado.', 404);
    }

    // Garante métricas
    await this.getCarbonAnalysis(fieldId, safra);

    const metrics = await prisma.fieldMetric.findMany({
      where: { fieldId },
      orderBy: { createdAt: 'asc' },
    });

    const series = metrics.map((m) => ({
      mes: m.month,
      precipitacao: Math.round(m.precipitacao),
      agua: Math.round(m.aguaSolo),
      limiar: Math.round(m.limiarCritico),
    }));

    const chuvaAcumulada = series.reduce(
      (acc, curr) => acc + curr.precipitacao,
      0,
    );
    const umidadeMedia =
      series.length > 0
        ? Math.round(
            series.reduce((acc, curr) => acc + curr.agua, 0) / series.length,
          )
        : 0;
    const diasAbaixoLimiar =
      series.filter((s) => s.agua < s.limiar).length * 10;

    const anomalias = [
      {
        level: 'alto' as const,
        period: 'Jan – Fev 2024',
        title: 'Déficit hídrico severo sob La Niña',
        detail:
          'Precipitação 68% abaixo da média histórica. Água no solo cruzou o limiar de murcha por 21 dias consecutivos.',
      },
      {
        level: 'medio' as const,
        period: 'Dez 2023',
        title: 'Veranico prolongado',
        detail:
          '18 dias sem chuva significativa durante o período reprodutivo da cultura de verão.',
      },
      {
        level: 'baixo' as const,
        period: 'Mar 2024',
        title: 'Recuperação gradual da umidade',
        detail:
          'Chuvas de outono reidrataram o perfil do solo, atingindo 58% da capacidade de campo.',
      },
    ];

    return {
      safra,
      fieldId: field.id,
      fieldName: field.name,
      propertyName: field.property.name,
      series,
      kpis: {
        chuvaAcumulada,
        umidadeMedia,
        diasAbaixoLimiar,
        statusHidrico: umidadeMedia > 50 ? 'Favorável' : 'Atenção Hídrica',
      },
      anomalias,
    };
  }

  /**
   * Histórico de monitoramento e eventos de uma propriedade
   */
  public async getPropertyMonitoringHistory(
    propertyId: string,
  ): Promise<PropertyMonitoringHistoryDTO> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        fields: true,
        events: {
          include: { field: true },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!property) {
      throw new AppError('Propriedade não encontrada.', 404);
    }

    // Se não houver eventos, criamos eventos iniciais do sistema
    if (property.events.length === 0) {
      const defaultEvents = [
        {
          type: MonitoringEventType.Ready,
          title: 'Balanço de carbono consolidado disponível',
          detail:
            'Processamento de torres de fluxo e satélite concluído com sucesso.',
          fieldId: property.fields[0]?.id,
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        },
        {
          type: MonitoringEventType.Processing,
          title: 'Sensoriamento Sentinel-2A em andamento',
          detail: 'Calibração espectral de NDVI e reflectância do solo.',
          fieldId: property.fields[1]?.id ?? property.fields[0]?.id,
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        },
        {
          type: MonitoringEventType.Sent,
          title: 'Manejos e insumos enviados para análise',
          detail: 'Lote de dados de safra sincronizado com a plataforma.',
          fieldId: property.fields[0]?.id,
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
        },
        {
          type: MonitoringEventType.Season,
          title: 'Cronograma da Safra 23/24 registrado',
          detail: 'Ciclos de cultura e cobertura vegetal parametrizados.',
          fieldId: property.fields[0]?.id,
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        },
      ];

      for (const ev of defaultEvents) {
        await prisma.monitoringEvent.create({
          data: {
            propertyId,
            type: ev.type,
            title: ev.title,
            detail: ev.detail,
            fieldId: ev.fieldId,
            date: ev.date,
          },
        });
      }
    }

    const updatedProperty = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: {
        events: {
          include: { field: true },
          orderBy: { date: 'desc' },
        },
      },
    });

    return {
      propertyId: property.id,
      propertyName: property.name,
      balancoPorSafra: [
        { safra: '20/21', balanco: 18 },
        { safra: '21/22', balanco: 24 },
        { safra: '22/23', balanco: 31 },
        { safra: '23/24', balanco: 40 },
      ],
      events: updatedProperty.events.map((e) => ({
        id: e.id,
        type: e.type as any,
        title: e.title,
        detail: e.detail,
        date: e.date,
        propertyId: e.propertyId,
        fieldId: e.fieldId,
        fieldName: e.field?.name,
      })),
    };
  }

  /**
   * Retorna os resultados detalhados de um talhão
   */
  public async getTalhaoResults(
    fieldId: string,
  ): Promise<TalhaoResultsResponseDTO> {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: { property: true },
    });

    if (!field) {
      throw new AppError('Talhão não encontrado.', 404);
    }

    // Assegura métricas
    await this.getCarbonAnalysis(fieldId);

    const metrics = await prisma.fieldMetric.findMany({
      where: { fieldId },
      orderBy: { createdAt: 'asc' },
    });

    const carbonSeries = metrics.slice(0, 6).map((m, idx) => ({
      mes: m.month,
      estoque: 42 + idx * 4,
      emissao: 8 - (idx % 3),
    }));

    const waterSeries = metrics.slice(0, 6).map((m) => ({
      mes: m.month,
      ndvi: Number(m.ndvi.toFixed(2)),
      chuva: Math.round(m.precipitacao),
    }));

    return {
      fieldId: field.id,
      propertyId: field.propertyId,
      name: field.name,
      code: field.code,
      area: field.area,
      soilType: field.soilType,
      kpis: {
        balancoCarbono: '+12 t CO2e',
        estoqueSolo: '63 t/ha',
        eficienciaHidrica: '0,82 NDVI',
      },
      carbonSeries,
      waterSeries,
    };
  }

  /**
   * Dados de todos os talhões para o mapa interativo
   */
  public async getMapExplorerData(
    userId: string,
  ): Promise<MapExplorerResponseDTO> {
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      include: { fields: true },
    });

    const talhoes = properties.flatMap((p) =>
      p.fields.map((f) => ({
        id: f.id,
        name: f.name,
        code: f.code,
        area: f.area,
        status: f.status,
        soilType: f.soilType,
        coordinates: f.coordinates,
        propertyId: p.id,
        propertyName: p.name,
        location: p.location,
        carbonBalance: '+14 t',
      })),
    );

    return {
      talhoes,
      availableLayers: ['Satélite', 'NDVI', 'Solo'],
    };
  }
}
