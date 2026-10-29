import shp from 'shpjs';
import * as turf from '@turf/turf';
import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  ConfirmShapefileImportDTO,
  ShapefileImportResponseDTO,
  GisFeatureSummaryDTO,
} from '@lib/shared';

export class GisService {
  /**
   * Processa o buffer compactado de um Shapefile (.zip) ou GeoJSON e extrai os polígonos
   */
  public async parseShapefile(
    buffer: Buffer,
  ): Promise<ShapefileImportResponseDTO> {
    let geojsonResult: any;

    try {
      geojsonResult = await shp(buffer);
    } catch (err: any) {
      throw new AppError(
        `Falha ao processar arquivo Shapefile: ${err?.message || 'Arquivo corrompido ou formato inválido.'}`,
        400,
      );
    }

    // Se o zip possuir múltiplos layers, shpjs retorna um array
    const featureCollections: any[] = Array.isArray(geojsonResult)
      ? geojsonResult
      : [geojsonResult];

    const summarizedFeatures: GisFeatureSummaryDTO[] = [];
    let featureIndex = 0;

    for (const fc of featureCollections) {
      if (!fc || !Array.isArray(fc.features)) continue;

      for (const feature of fc.features) {
        if (!feature || !feature.geometry) continue;

        const geomType = feature.geometry.type;
        if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') {
          continue;
        }

        // Cálculo de área em hectares e perímetro com @turf/turf
        let areaHa = 0;
        let perimeterMeters = 0;

        try {
          const areaM2 = turf.area(feature);
          areaHa = Number((areaM2 / 10000).toFixed(2));

          const lengthKm = turf.length(feature, { units: 'kilometers' });
          perimeterMeters = Number((lengthKm * 1000).toFixed(1));
        } catch {
          // Fallback caso geometria seja pontual
        }

        // Extração de coordenadas do anel externo em formato { lat, lng }
        const coords: { lat: number; lng: number }[] = [];

        if (geomType === 'Polygon') {
          const ring = feature.geometry.coordinates[0] || [];
          for (const [lng, lat] of ring) {
            coords.push({ lat, lng });
          }
        } else if (geomType === 'MultiPolygon') {
          const firstPoly = feature.geometry.coordinates[0];
          const ring = firstPoly ? firstPoly[0] || [] : [];
          for (const [lng, lat] of ring) {
            coords.push({ lat, lng });
          }
        }

        if (coords.length < 3) continue;

        const props = feature.properties || {};
        const name =
          props.NOME ||
          props.Nome ||
          props.nome ||
          props.NAME ||
          props.name ||
          props.TALHAO ||
          props.Talhao ||
          props.talhao ||
          `Talhão ${featureIndex + 1}`;

        const code =
          props.CODIGO ||
          props.Codigo ||
          props.codigo ||
          props.CODE ||
          props.code ||
          `TLH-${String(featureIndex + 1).padStart(2, '0')}`;

        summarizedFeatures.push({
          index: featureIndex,
          name: String(name),
          code: String(code),
          areaHa,
          perimeterMeters,
          coordinates: coords,
          properties: props,
        });

        featureIndex++;
      }
    }

    if (summarizedFeatures.length === 0) {
      throw new AppError(
        'Nenhum polígono válido de talhão foi encontrado no arquivo Shapefile.',
        400,
      );
    }

    // Calcula bounding box geral
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const f of summarizedFeatures) {
      for (const pt of f.coordinates) {
        if (pt.lng < minLng) minLng = pt.lng;
        if (pt.lng > maxLng) maxLng = pt.lng;
        if (pt.lat < minLat) minLat = pt.lat;
        if (pt.lat > maxLat) maxLat = pt.lat;
      }
    }

    return {
      totalFeatures: summarizedFeatures.length,
      boundingBox: [minLng, minLat, maxLng, maxLat],
      features: summarizedFeatures,
    };
  }

  /**
   * Confirma e persiste talhões extraídos de shapefile em uma propriedade
   */
  public async confirmImport(data: ConfirmShapefileImportDTO, userId: string) {
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property || property.ownerId !== userId) {
      throw new AppError(
        'Propriedade não encontrada ou acesso não autorizado.',
        404,
      );
    }

    const createdFields = [];

    for (const fieldInput of data.fields) {
      const created = await prisma.field.create({
        data: {
          propertyId: data.propertyId,
          name: fieldInput.name,
          code: fieldInput.code,
          soilType: fieldInput.soilType || 'Latossolo Vermelho',
          area: fieldInput.area || null,
          perimeter: fieldInput.perimeter || null,
          coordinates: fieldInput.coordinates.map((pt) => ({
            x: pt.lng,
            y: pt.lat,
          })),
          status: 'READY',
        },
      });

      createdFields.push(created);
    }

    await prisma.monitoringEvent.create({
      data: {
        propertyId: data.propertyId,
        type: 'READY',
        title: 'Importação de Shapefile Concluída',
        detail: `${createdFields.length} talhão(ões) georreferenciado(s) importado(s) com sucesso.`,
      },
    });

    return createdFields;
  }
}
