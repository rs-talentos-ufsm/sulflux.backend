import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';

// // 1. IMPORTAÇÕES DE DIAGNÓSTICO
// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// // 2. LIGA O RAIO-X NO MODO DEBUG
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/traces',
});

// Inicializa o SDK (Ele puxará o SERVICE_NAME do seu .env automaticamente)
export const otelSDK = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new PrismaInstrumentation(),
  ],
});

process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.warn('OpenTelemetry SDK finalizado.'))
    .catch((error) =>
      console.error('Erro ao finalizar OpenTelemetry SDK', error),
    )
    .finally(() => process.exit(0));
});
