# Observabilidade e Telemetria: Rastreamento de Performance com Jaeger UI

A instrumentação do **OpenTelemetry (OTel)** capta o comportamento interno do sistema, enquanto o **Jaeger UI** funciona como a camada visual que traduz esses dados em gráficos de linha do tempo. Ele é a ferramenta de análise de performance e depuração de erros mais utilizada em ambientes de produção, especialmente para sistemas distribuídos.

---

## 1. O Gráfico de Dispersão (Análise de Tendência)

No topo da tela de resultados, o Jaeger renderiza um gráfico de pontos temporais (_Scatter Plot_). Cada círculo celeste representa uma requisição HTTP capturada no backend.

```
 Duração
  (ms)
   ▲
16 ┼      ● (Requisição lenta / Primeira chamada)
   ┼
 8 ┼
   ┼                                      ● (Requisição otimizada)
 0 ┼──────┴───────────────────────────────┴────────► Tempo

```

### Elementos do Gráfico:

- **Eixo Vertical (Duration):** Indica o tempo exato (em milissegundos ou segundos) que a requisição levou para ser totalmente processada e respondida.
- **Eixo Horizontal (Time):** Linha do tempo linear mostrando o momento exato em que o gatilho ocorreu.

### Utilidade Prática:

Em ambientes de produção sob alta carga, esse gráfico permite identificar **degradação de performance**. Se o sistema começar a sofrer lentidão generalizada ou gargalos no banco de dados, os círculos começarão a subir verticalmente, formando uma "nuvem" no topo do gráfico. Clicar em qualquer ponto isolado te leva direto para a anatomia daquela requisição específica.

---

## 2. O Bloco do Trace (Visão Macro)

Logo abaixo do gráfico, as requisições são listadas em cartões horizontais detalhados, conhecidos como **Traces**.

### Anatomia do Bloco:

1. **Nome do Serviço e Operação (`backend: GET /api/health`):** Mostra qual aplicação capturou o evento e qual foi o método HTTP e rota acionados.
2. **Trace ID (`173bf9d`):** O identificador alfanumérico global e único daquela requisição. Ele funciona como o "RG" do ciclo de vida do evento.
3. **Duração Total (`3.66ms`):** O tempo computacional gasto desde o instante em que o Express recebeu o pacote de rede até o disparo da resposta final.
4. **Contagem de Spans (`16 Spans`):** Indica em quantas suboperações internas o OpenTelemetry dividiu essa rota para analisar a execução.

---

## 3. A Visão em Cascata (Visão Micro dos Spans)

Ao clicar em um bloco de Trace, a interface se expande na **Visão em Cascata (Waterfall)**. Esta é a ferramenta mais poderosa para engenharia de performance, pois quebra a rota horizontalmente pelo tempo gasto em cada função.

Como o projeto utiliza a biblioteca `@opentelemetry/auto-instrumentations-node`, uma rota simples como o healthcheck é destrinchada automaticamente pelo OTel:

```text
▲ [GET /api/health] ──────────────────────────────────────────────┐ Duração: 3.66ms (Express)
  ├── [middleware - helmet] ──┐                                    │ Duração: 0.2ms  (Segurança)
  ├── [middleware - rateLimit] ────┐                               │ Duração: 0.4ms  (Limitação)
  ├── [middleware - cors] ─────────┐                               │ Duração: 0.3ms  (CORS)
  └── [route - /api/health] ───────────────────────────────────────┘ Duração: 2.7ms  (Regra de Negócio)

```

### O Fluxo Interno dos Spans:

- **Span Raiz (Pai):** A barra que engloba o tempo total (`GET /api/health`).
- **Spans Filhos:** As barras internas. O Jaeger exibe visualmente se os middlewares rodaram em paralelo ou em sequência (cascata), medindo o impacto individual de cada dependência (Helmet, CORS, Rate Limit) no tempo de resposta final entregue ao cliente.

---

## 4. Como Usar o Jaeger para Diagnósticos neste projeto

Abaixo estão os cenários reais de engenharia onde a leitura desses dados dita as tomadas de decisão arquiteturais:

### Cenário A: Identificação de Gargalos em Banco de Dados

Ao criar a rota de cadastro de projetos (`POST /api/projects`), ela começa a responder em `850ms`.

- **O Diagnóstico no Jaeger:** Você abre o Trace e nota que os middlewares e a validação do Zod ocuparam apenas `10ms`. No entanto, há um span filho profundo gerado pelo `@prisma/instrumentation` chamado `prisma:client:operation` durando `840ms`.
- **A Solução:** O problema não está no TypeScript, mas sim no banco de dados. O desenvolvedor cria um **índice descritivo** no PostgreSQL para aquela tabela e o tempo cai para `5ms`.

### Cenário B: Depuração de Erros em Produção (RCA)

Um usuário relata que o sistema apresentou uma tela de erro inesperada ao tentar gerar um relatório acadêmico.

- **O Diagnóstico no Jaeger:** O front-end captura o `Trace ID` da falha e exibe na tela para o usuário (ou envia para a ferramenta de log). Você cola o ID no campo `Lookup by Trace ID` no canto superior direito do Jaeger. O Jaeger abrirá o rastro exato daquele erro, marcando o Span defeituoso com uma **tarja vermelha** e exibindo o _Stack Trace_ do erro disparado pelo Node.js.
- **A Solução:** Correção cirúrgica do bug com base exata na linha descrita pelo erro anexado ao Span.
