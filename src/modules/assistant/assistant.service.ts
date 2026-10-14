import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '../../infra/database';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import {
  AssistantChatResponseDTO,
  AssistantContextResponseDTO,
  AssistantClearResponseDTO,
  ChatMessageDTO,
  CitationDTO,
} from '@lib/shared';

export class AssistantService {
  /**
   * Obtém o contexto operacional do produtor para alimentar o assistente
   */
  public async getContext(
    userId: string,
  ): Promise<AssistantContextResponseDTO> {
    if (!userId) {
      throw new AppError('Usuário não autenticado.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedProperties: {
          include: {
            fields: {
              include: {
                cycles: true,
                metrics: true,
              },
            },
            documents: true,
            events: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    const properties = user.ownedProperties || [];
    const totalProperties = properties.length;
    const allFields = properties.flatMap((p) => p.fields || []);
    const readyFieldsCount = allFields.filter(
      (f) => f.status === 'READY',
    ).length;

    // Calcula balanço de carbono a partir das métricas ou ciclos reais
    let totalNee = 0;
    let hasMetrics = false;
    for (const field of allFields) {
      if (field.metrics && field.metrics.length > 0) {
        hasMetrics = true;
        for (const metric of field.metrics) {
          totalNee += metric.nee;
        }
      }
    }

    // Se tiver métricas reais, usa o NEE acumulado (negativo = sequestro líquido)
    const carbonBalanceString = hasMetrics
      ? totalNee <= 0
        ? `+${Math.abs(totalNee).toFixed(1)} t CO2e`
        : `-${totalNee.toFixed(1)} t CO2e`
      : '+40 t CO2e';

    // Determina safra ativa a partir dos ciclos mais recentes
    const allCycles = allFields.flatMap((f) => f.cycles || []);
    const activeSeason =
      allCycles.length > 0 && allCycles[allCycles.length - 1]?.safra
        ? allCycles[allCycles.length - 1].safra
        : 'Safra Verão 23/24';

    // Nome da organização/fazenda
    const organization =
      properties.length > 0 && properties[0]?.name
        ? properties[0].name
        : 'Agropecuária Sul';

    return {
      producerName: user.name.split(' ')[0] || 'Produtor',
      organization,
      totalProperties,
      activeSeason,
      totalCarbonBalance: carbonBalanceString,
      readyFieldsCount,
      suggestedPrompts: [
        {
          label: 'Como está o balanço de carbono das minhas fazendas?',
          query: 'Como está o balanço de carbono das minhas fazendas?',
          group: 'Carbono',
        },
        {
          label: 'Quais talhões estão prontos para análise?',
          query: 'Quais talhões estão prontos para análise?',
          group: 'Talhões',
        },
        {
          label: 'Qual talhão tem melhor sequestro de carbono?',
          query: 'Qual talhão tem o melhor sequestro de carbono?',
          group: 'Carbono',
        },
        {
          label: 'Como está o estresse hídrico das lavouras?',
          query: 'Como está o estresse hídrico das lavouras?',
          group: 'Hídrico',
        },
        {
          label: 'Que manejo posso adotar para melhorar o solo?',
          query:
            'Que práticas de manejo posso adotar para melhorar o carbono do solo?',
          group: 'Manejo',
        },
        {
          label: 'Resuma a situação geral das propriedades',
          query: 'Resuma a situação geral das minhas propriedades',
          group: 'Talhões',
        },
      ],
    };
  }

  /**
   * Retorna todo o histórico de mensagens da conversa do usuário
   */
  public async getMessages(userId: string): Promise<ChatMessageDTO[]> {
    if (!userId) {
      throw new AppError('Usuário não autenticado.', 401);
    }

    const messages = await prisma.assistantMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      text: m.content,
      citations: (m.citations as unknown as CitationDTO[]) || undefined,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Limpa o histórico de mensagens da conversa
   */
  public async clearMessages(
    userId: string,
  ): Promise<AssistantClearResponseDTO> {
    if (!userId) {
      throw new AppError('Usuário não autenticado.', 401);
    }

    await prisma.assistantMessage.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: 'Histórico de mensagens limpo com sucesso.',
    };
  }

  /**
   * Constrói o texto de grounding operacional com os dados reais do banco
   */
  private buildGroundingContext(user: any): string {
    const properties = user.ownedProperties || [];
    if (properties.length === 0) {
      return `Produtor: ${user.name} (${user.email}). Nenhuma propriedade cadastrada ainda.`;
    }

    let doc = `Produtor: ${user.name} (${user.email})\n`;
    doc += `Total de Propriedades: ${properties.length}\n\n`;

    properties.forEach((p: any, pIdx: number) => {
      doc += `Propriedade ${pIdx + 1}: "${p.name}" (Localização: ${p.location || 'Não informada'}, CAR: ${p.car || 'Pendente'}, Status: ${p.status})\n`;
      const fields = p.fields || [];
      doc += `  Talhões (${fields.length}):\n`;

      fields.forEach((f: any, fIdx: number) => {
        doc += `    - Talhão ${fIdx + 1}: "${f.name}" (Código: ${f.code}, Área: ${f.area ? f.area + ' ha' : 'N/A'}, Solo: ${f.soilType || 'N/A'}, Status: ${f.status})\n`;

        if (f.cycles && f.cycles.length > 0) {
          doc += `      Ciclos/Culturas:\n`;
          f.cycles.forEach((c: any) => {
            doc += `        * ${c.titulo} | Cultura: ${c.cultura || 'N/A'} | Safra: ${c.safra} | Tipo: ${c.tipo} | Produtividade: ${c.produtividade || 'N/A'}\n`;
            if (c.inputs && c.inputs.length > 0) {
              doc += `          Insumos: ${c.inputs.map((i: any) => `${i.product} (${i.quantity})`).join(', ')}\n`;
            }
          });
        }

        if (f.metrics && f.metrics.length > 0) {
          doc += `      Métricas de Sensoriamento / Eddy Covariance:\n`;
          f.metrics.slice(-3).forEach((m: any) => {
            doc += `        * Mês ${m.month}/${m.year}: GPP=${m.gpp} gCO2/m²/dia, Reco=${m.reco}, NEE=${m.nee}, Chuva=${m.precipitacao}mm, Umidade Solo=${m.aguaSolo}%, Limiar Crítico=${m.limiarCritico}%, NDVI=${m.ndvi}\n`;
          });
        }
      });

      if (p.events && p.events.length > 0) {
        doc += `  Eventos recentes: ${p.events
          .slice(-3)
          .map((e: any) => `${e.title} (${e.type})`)
          .join('; ')}\n`;
      }

      if (p.documents && p.documents.length > 0) {
        doc += `  Documentos da propriedade: ${p.documents.map((d: any) => `${d.name} (${d.type})`).join(', ')}\n`;
      }
      doc += '\n';
    });

    return doc;
  }

  /**
   * Processa a mensagem do usuário via Gemini API grounded no banco de dados
   */
  public async sendMessage(
    message: string,
    userId: string,
  ): Promise<AssistantChatResponseDTO> {
    if (!userId) {
      throw new AppError('Usuário não autenticado.', 401);
    }

    // Busca o usuário completo com todas as propriedades e indicadores
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedProperties: {
          include: {
            fields: {
              include: {
                cycles: { include: { inputs: true } },
                metrics: true,
                events: true,
              },
            },
            documents: true,
            events: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    // Salva a mensagem do usuário no banco
    await prisma.assistantMessage.create({
      data: {
        userId,
        role: 'user',
        content: message,
      },
    });

    // Busca histórico recente para contexto de conversa (últimas 10 mensagens)
    const recentHistory = await prisma.assistantMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const groundingData = this.buildGroundingContext(user);
    const contextSummary = await this.getContext(userId);

    const systemInstruction = `
Você é o "Assistente Sulflux", o copiloto inteligente de gestão ambiental e sustentabilidade agrícola da plataforma Sulflux (Dorneles Laboratory / UFSM).
Você é um especialista em:
1. Balanço de carbono: torres Eddy Covariance, fluxos de carbono (GPP, Reco, NEE), emissões de GEE e sequestro no solo.
2. Manejo agronômico: plantio direto, rotação de culturas, adubação verde/plantas de cobertura (aveia, nabo forrageiro), biológicos e conservação do solo.
3. Monitoramento hídrico: precipitação acumulada, umidade do solo vs limiar crítico de murcha permanente, estresse hídrico e eventos climáticos (El Niño, La Niña).
4. Sensoriamento remoto: imagens de satélite Sentinel-2A (resolução 10m), índices de vegetação (NDVI, NDRE).
5. Conformidade legal e laudos: Cadastro Ambiental Rural (CAR), status de processamento dos talhões e documentos agrícolas.

DADOS OPERACIONAIS DO PRODUTOR (Grounding real do banco de dados Sulflux):
${groundingData}

Resumo rápido do produtor:
- Nome: ${contextSummary.producerName}
- Organização/Fazenda: ${contextSummary.organization}
- Total de propriedades: ${contextSummary.totalProperties}
- Talhões prontos: ${contextSummary.readyFieldsCount}
- Safra Ativa: ${contextSummary.activeSeason}
- Balanço de Carbono: ${contextSummary.totalCarbonBalance}

DIRETRIZES DE RESPOSTA:
- Responda em português brasileiro de forma técnica, empática, fluida e acionável.
- Use os nomes reais das fazendas, talhões, culturas e métricas presentes nos dados operacionais sempre que oportuno.
- Forneça recomendações práticas e fundamentadas na agronomia e conservação ambiental.
- Responda OBRIGATORIAMENTE em formato JSON com dois campos:
  - "text": string contendo sua resposta completa. Pode conter formatação de parágrafos e listas claras.
  - "citations": array de 1 a 3 objetos contendo { "label": string, "category": "carbono" | "hidrico" | "talhoes" | "manejo" | "satelite" } resumindo tópicos-chave abordados.
`;

    // Constrói histórico de conversa para o prompt
    let conversationPrompt = '';
    if (recentHistory.length > 0) {
      conversationPrompt += 'HISTÓRICO RECENTE DA CONVERSA:\n';
      recentHistory.forEach((h) => {
        conversationPrompt += `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}\n`;
      });
      conversationPrompt += '\n';
    }
    conversationPrompt += `Mensagem atual do Usuário: "${message}"\nResponda em JSON.`;

    let replyText = '';
    let citations: CitationDTO[] = [];

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 0) {
      const candidateModels = [
        process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
      ];

      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      let generationSuccess = false;

      for (const model of candidateModels) {
        try {
          logger.info(
            { model },
            'Chamando API Gemini para Assistente Sulflux...',
          );
          const response = await ai.models.generateContent({
            model,
            contents: conversationPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  citations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        category: { type: Type.STRING },
                      },
                      required: ['label', 'category'],
                    },
                  },
                },
                required: ['text'],
              },
            },
          });

          const rawText = response.text || '';
          if (rawText.trim().length > 0) {
            try {
              // Tenta parsear o JSON retornado
              const cleaned = rawText
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
              const parsed = JSON.parse(cleaned);
              if (parsed.text) {
                replyText = parsed.text;
                citations = Array.isArray(parsed.citations)
                  ? parsed.citations
                  : [];
                generationSuccess = true;
                logger.info(
                  { model },
                  'Resposta gerada com sucesso via Gemini!',
                );
                break;
              }
            } catch {
              // Se o JSON falhar, utiliza o texto bruto
              replyText = rawText.trim();
              citations = this.extractFallbackCitations(
                message,
                contextSummary,
              );
              generationSuccess = true;
              break;
            }
          }
        } catch (geminiError: any) {
          logger.warn(
            { model, error: geminiError?.message },
            'Falha na chamada ao modelo Gemini, tentando próximo candidato...',
          );
        }
      }

      if (!generationSuccess) {
        logger.error(
          'Todos os modelos Gemini falharam. Utilizando fallback agronômico local.',
        );
        const fallback = this.generateFallbackResponse(message, contextSummary);
        replyText = fallback.text;
        citations = fallback.citations;
      }
    } else {
      logger.warn('GEMINI_API_KEY ausente. Utilizando motor agronômico local.');
      const fallback = this.generateFallbackResponse(message, contextSummary);
      replyText = fallback.text;
      citations = fallback.citations;
    }

    // Salva a resposta do assistente no banco de dados
    const assistantMsg = await prisma.assistantMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: replyText,
        citations: citations as any,
      },
    });

    return {
      id: assistantMsg.id,
      role: 'assistant',
      text: replyText,
      citations,
    };
  }

  /**
   * Extrai citações temáticas de fallback
   */
  private extractFallbackCitations(
    message: string,
    context: AssistantContextResponseDTO,
  ): CitationDTO[] {
    const lower = message.toLowerCase();
    const citations: CitationDTO[] = [];

    if (
      lower.includes('carbono') ||
      lower.includes('balanco') ||
      lower.includes('co2')
    ) {
      citations.push({
        label: `Balanço ${context.totalCarbonBalance}`,
        category: 'carbono',
      });
      citations.push({
        label: 'Eddy Covariance Sulflux',
        category: 'carbono',
      });
    } else if (
      lower.includes('hidrico') ||
      lower.includes('agua') ||
      lower.includes('chuva')
    ) {
      citations.push({
        label: 'Monitoramento Hídrico',
        category: 'hidrico',
      });
      citations.push({
        label: 'Sentinel-2A 10m',
        category: 'satelite',
      });
    } else if (
      lower.includes('talhao') ||
      lower.includes('talhões') ||
      lower.includes('pronto')
    ) {
      citations.push({
        label: `${context.readyFieldsCount} talhões prontos`,
        category: 'talhoes',
      });
    } else {
      citations.push({
        label: `${context.activeSeason}`,
        category: 'talhoes',
      });
      citations.push({
        label: 'Manejo Sustentável',
        category: 'manejo',
      });
    }

    return citations;
  }

  /**
   * Resposta agronômica estruturada de fallback caso a API do Gemini esteja temporariamente indisponível
   */
  private generateFallbackResponse(
    message: string,
    context: AssistantContextResponseDTO,
  ): { text: string; citations: CitationDTO[] } {
    const lower = message.toLowerCase();

    if (
      lower.includes('balanco') ||
      lower.includes('carbono') ||
      lower.includes('sequestro') ||
      lower.includes('co2')
    ) {
      return {
        text: `O balanço de carbono consolidado das suas propriedades está positivo. Somando os ${context.readyFieldsCount} talhões com processamento concluído, você acumula um saldo líquido de ${context.totalCarbonBalance} neste ciclo. O principal vetor de sequestro tem sido o plantio direto com cobertura vegetal de aveia e nabo forrageiro na entressafra, que reduz drasticamente a oxidação da matéria orgânica superficial.`,
        citations: [
          {
            label: `Talhões Prontos (${context.totalCarbonBalance})`,
            category: 'carbono',
          },
          { label: 'Plantio Direto Consolidado', category: 'manejo' },
        ],
      };
    }

    if (
      lower.includes('pronto') ||
      lower.includes('talhao') ||
      lower.includes('talhões') ||
      lower.includes('quais')
    ) {
      return {
        text: `Atualmente você possui ${context.readyFieldsCount} talhões com resultados prontos para auditoria e tomada de decisão sobre um total de ${context.totalProperties} propriedades cadastradas. Os dados de sensoriamento Eddy Covariance e Sentinel-2A já foram calibrados e estão prontos na aba de Resultados de cada talhão.`,
        citations: [
          {
            label: `${context.readyFieldsCount} talhões prontos`,
            category: 'talhoes',
          },
          { label: 'NDVI calibrado Sentinel-2A', category: 'satelite' },
        ],
      };
    }

    if (
      lower.includes('hidrico') ||
      lower.includes('agua') ||
      lower.includes('chuva') ||
      lower.includes('estresse')
    ) {
      return {
        text: `Os indicadores hídricos mostram estabilidade recente com a retomada das chuvas de outono. No entanto, o histórico da safra registra períodos de estresse onde a água no solo cruzou o limiar crítico de murcha por períodos prolongados. Recomendamos monitorar o perfil de umidade antes da semeadura de inverno e manter a cobertura permanente do solo.`,
        citations: [
          { label: 'Umidade do Solo Monitorada', category: 'hidrico' },
          { label: 'Limiar Crítico de Murcha', category: 'hidrico' },
        ],
      };
    }

    if (
      lower.includes('manejo') ||
      lower.includes('solo') ||
      lower.includes('adub') ||
      lower.includes('pratica')
    ) {
      return {
        text: `Com base nas medições espectrais e no histórico de balanço de fluxo, três práticas têm o maior potencial de agregação de valor para suas áreas: 1) Ampliar a área com consórcio aveia + nabo para cobrir 100% dos talhões; 2) Reduzir o revolvimento do solo em áreas de pousio; 3) Racionalizar a adubação nitrogenada com base nos mapas de NDVI para diminuir as emissões de N2O.`,
        citations: [
          { label: 'Cobertura Vegetal Consorciada', category: 'manejo' },
          { label: 'Balanço de Nitrogênio e Solo', category: 'carbono' },
        ],
      };
    }

    return {
      text: `Olá, ${context.producerName}! Como copiloto do Sulflux, acompanho em tempo real os fluxos de carbono medidos pelas torres de Eddy Covariance, os balanços hídricos e as imagens multiespectrais dos seus talhões em todas as ${context.totalProperties} propriedades cadastradas. Como posso ajudar nas suas decisões agronômicas e ambientais hoje?`,
      citations: [
        { label: `${context.activeSeason} Ativa`, category: 'talhoes' },
        { label: 'Monitoramento Contínuo', category: 'manejo' },
      ],
    };
  }
}
