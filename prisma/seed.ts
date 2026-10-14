import readline from 'readline';
import { prisma } from '../src/infra/database.js';
import { PasswordService } from '../src/utils/password.service.js';

async function seedDatabase() {
  console.log('Starting Sulflux database seeder...');

  // 1. Limpeza em ordem de dependência (filhos antes dos pais)
  console.log('Cleaning existing data...');
  await prisma.assistantMessage.deleteMany();
  await prisma.farmDocument.deleteMany();
  await prisma.monitoringEvent.deleteMany();
  await prisma.fieldMetric.deleteMany();
  await prisma.fieldInput.deleteMany();
  await prisma.cropCycle.deleteMany();
  await prisma.field.deleteMany();
  await prisma.property.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  console.log('Tables cleaned.');

  // 2. Criação dos Usuários
  console.log('Seeding Users...');
  const adminHashedPassword = await PasswordService.hash('Admin@2026');
  const alecsanderHashedPassword =
    await PasswordService.hash('Alecsander@2026');
  const fernandoHashedPassword = await PasswordService.hash('Usertest123');

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador Sulflux',
      email: 'admin@sulflux.com',
      password: adminHashedPassword,
      isActive: true,
    },
  });
  console.log(`User created: ${admin.email} (ID: ${admin.id})`);

  const alecsander = await prisma.user.create({
    data: {
      name: 'Alecsander Sulflux',
      email: 'alecsander@sulflux.com',
      password: alecsanderHashedPassword,
      isActive: true,
    },
  });
  console.log(`User created: ${alecsander.email} (ID: ${alecsander.id})`);

  const user = await prisma.user.create({
    data: {
      name: 'Fernando Dorneles',
      email: 'fernandodorneles95@gmail.com',
      password: fernandoHashedPassword,
      isActive: true,
    },
  });
  console.log(`User created: ${user.email} (ID: ${user.id})`);

  // 3. Criação de Propriedades
  console.log('Seeding Properties...');
  const property = await prisma.property.create({
    data: {
      name: 'Fazenda Santa Maria',
      location: 'Santa Maria, RS',
      car: 'RS-4316907-8821B0912A314B5C8D7E9F0A1B2C3D4E',
      area: 234.3,
      fiscalModules: 11.7,
      ownerName: 'Administrador Sulflux',
      coordinates: [
        { lat: -29.711, lng: -53.718 },
        { lat: -29.7115, lng: -53.701 },
        { lat: -29.731, lng: -53.702 },
        { lat: -29.7305, lng: -53.7185 },
      ],
      status: 'ACTIVE',
      ownerId: admin.id,
    },
  });

  // Também vincula a fazenda ao usuário Fernando e Alecsander para testes se necessário
  const propertyAlecsander = await prisma.property.create({
    data: {
      name: 'Fazenda Vale do Pampa',
      location: 'Uruguaiana, RS',
      car: 'RS-4322400-5512C1023B444F888A9B0C1D2E3F4A5B',
      area: 1250.0,
      fiscalModules: 44.6,
      ownerName: 'Alecsander Sulflux',
      coordinates: [
        { lat: -29.752, lng: -57.085 },
        { lat: -29.751, lng: -57.065 },
        { lat: -29.775, lng: -57.068 },
        { lat: -29.774, lng: -57.088 },
      ],
      status: 'ACTIVE',
      ownerId: alecsander.id,
    },
  });

  // 4. Criação de Talhões (Fields)
  console.log('Seeding Fields...');
  const field1 = await prisma.field.create({
    data: {
      name: 'Talhão 01 - Sede',
      code: 'TAL-01',
      soilType: 'Latossolo Vermelho Distrófico',
      area: 145.8,
      perimeter: 4920.0,
      coordinates: [
        { lat: -29.7125, lng: -53.7156 },
        { lat: -29.7128, lng: -53.7021 },
        { lat: -29.721, lng: -53.7035 },
        { lat: -29.7205, lng: -53.716 },
      ],
      status: 'READY',
      propertyId: property.id,
    },
  });

  const field2 = await prisma.field.create({
    data: {
      name: 'Talhão 02 - Encosta Sul',
      code: 'TAL-02',
      soilType: 'Argissolo Vermelho-Amarelo',
      area: 88.5,
      perimeter: 3410.0,
      coordinates: [
        { lat: -29.722, lng: -53.715 },
        { lat: -29.7225, lng: -53.705 },
        { lat: -29.729, lng: -53.7062 },
        { lat: -29.7285, lng: -53.7158 },
      ],
      status: 'READY',
      propertyId: property.id,
    },
  });

  // 5. Criação de Ciclo de Safra
  console.log('Seeding Crop Cycle...');
  const cycle1 = await prisma.cropCycle.create({
    data: {
      tipo: 'COMMERCIAL',
      titulo: 'Soja Safra 23/24',
      safra: '2023/2024',
      cultura: 'Soja (Glycine max)',
      produtividade: '68 sc/ha',
      inicio: new Date('2023-10-15'),
      fim: new Date('2024-03-25'),
      fieldId: field1.id,
    },
  });

  // 6. Insumos do Ciclo
  console.log('Seeding Field Inputs...');
  await prisma.fieldInput.createMany({
    data: [
      {
        category: 'Fertilizante',
        product: 'NPK 04-30-10',
        quantity: '300 kg/ha',
        date: new Date('2023-10-15'),
        cycleId: cycle1.id,
      },
      {
        category: 'Biológico',
        product: 'Bradyrhizobium japonicum',
        quantity: '100 mL/ha',
        date: new Date('2023-10-15'),
        cycleId: cycle1.id,
      },
      {
        category: 'Fungicida',
        product: 'Trifloxistrobina + Protioconazol',
        quantity: '0.5 L/ha',
        date: new Date('2023-12-10'),
        cycleId: cycle1.id,
      },
    ],
  });

  // 7. Métricas Mensais (Fluxos de Carbono e Balanço Hídrico)
  console.log('Seeding Field Metrics...');
  const monthlyMetrics = [
    {
      month: 'Jan',
      year: 2024,
      gpp: 8.2,
      reco: 4.8,
      nee: -3.4,
      precipitacao: 145.0,
      aguaSolo: 62.0,
      limiarCritico: 45.0,
      ndvi: 0.82,
    },
    {
      month: 'Fev',
      year: 2024,
      gpp: 7.9,
      reco: 4.6,
      nee: -3.3,
      precipitacao: 120.0,
      aguaSolo: 58.5,
      limiarCritico: 45.0,
      ndvi: 0.85,
    },
    {
      month: 'Mar',
      year: 2024,
      gpp: 6.8,
      reco: 4.2,
      nee: -2.6,
      precipitacao: 90.0,
      aguaSolo: 52.0,
      limiarCritico: 45.0,
      ndvi: 0.76,
    },
    {
      month: 'Abr',
      year: 2024,
      gpp: 4.5,
      reco: 3.5,
      nee: -1.0,
      precipitacao: 65.0,
      aguaSolo: 48.0,
      limiarCritico: 45.0,
      ndvi: 0.58,
    },
    {
      month: 'Mai',
      year: 2024,
      gpp: 3.2,
      reco: 2.8,
      nee: -0.4,
      precipitacao: 110.0,
      aguaSolo: 65.0,
      limiarCritico: 45.0,
      ndvi: 0.45,
    },
    {
      month: 'Jun',
      year: 2024,
      gpp: 2.8,
      reco: 2.5,
      nee: -0.3,
      precipitacao: 130.0,
      aguaSolo: 70.0,
      limiarCritico: 45.0,
      ndvi: 0.4,
    },
    {
      month: 'Jul',
      year: 2024,
      gpp: 2.5,
      reco: 2.4,
      nee: -0.1,
      precipitacao: 80.0,
      aguaSolo: 63.0,
      limiarCritico: 45.0,
      ndvi: 0.38,
    },
    {
      month: 'Ago',
      year: 2024,
      gpp: 3.5,
      reco: 2.7,
      nee: -0.8,
      precipitacao: 75.0,
      aguaSolo: 55.0,
      limiarCritico: 45.0,
      ndvi: 0.42,
    },
    {
      month: 'Set',
      year: 2024,
      gpp: 5.1,
      reco: 3.4,
      nee: -1.7,
      precipitacao: 105.0,
      aguaSolo: 58.0,
      limiarCritico: 45.0,
      ndvi: 0.55,
    },
    {
      month: 'Out',
      year: 2024,
      gpp: 7.2,
      reco: 4.1,
      nee: -3.1,
      precipitacao: 140.0,
      aguaSolo: 64.0,
      limiarCritico: 45.0,
      ndvi: 0.7,
    },
    {
      month: 'Nov',
      year: 2024,
      gpp: 8.5,
      reco: 4.9,
      nee: -3.6,
      precipitacao: 160.0,
      aguaSolo: 68.0,
      limiarCritico: 45.0,
      ndvi: 0.84,
    },
    {
      month: 'Dez',
      year: 2024,
      gpp: 9.1,
      reco: 5.2,
      nee: -3.9,
      precipitacao: 135.0,
      aguaSolo: 61.0,
      limiarCritico: 45.0,
      ndvi: 0.88,
    },
  ];

  await prisma.fieldMetric.createMany({
    data: monthlyMetrics.map((m) => ({ ...m, fieldId: field1.id })),
  });

  // 8. Eventos de Monitoramento
  console.log('Seeding Monitoring Events...');
  await prisma.monitoringEvent.createMany({
    data: [
      {
        type: 'READY',
        title: 'Balanço Hídrico Consolidado',
        detail: 'Dados hidrológicos consolidados do mês anterior disponíveis.',
        date: new Date(),
        propertyId: property.id,
        fieldId: field1.id,
      },
      {
        type: 'PROCESSING',
        title: 'Índices Espectrais (NDVI/EVI)',
        detail:
          'Imagens Sentinel-2 em processamento pela torre micrometeorológica.',
        date: new Date(Date.now() - 3600 * 1000 * 24),
        propertyId: property.id,
        fieldId: field1.id,
      },
    ],
  });

  // 9. Documentos da Fazenda
  console.log('Seeding Farm Documents...');
  await prisma.farmDocument.createMany({
    data: [
      {
        name: 'CAR_Fazenda_Santa_Maria_2024.pdf',
        type: 'pdf',
        size: '2.4 MB',
        folder: 'Ambiental',
        fileUrl: '/uploads/CAR_Fazenda_Santa_Maria_2024.pdf',
        propertyId: property.id,
        userId: admin.id,
      },
      {
        name: 'Outorga_Agua_Vale_Pampa.pdf',
        type: 'pdf',
        size: '1.8 MB',
        folder: 'Recursos Hídricos',
        fileUrl: '/uploads/Outorga_Agua_Vale_Pampa.pdf',
        propertyId: propertyAlecsander.id,
        userId: alecsander.id,
      },
    ],
  });

  // Campo adicional para a Fazenda Vale do Pampa
  const fieldAlecsander = await prisma.field.create({
    data: {
      name: 'Pivô Central 01',
      code: 'PIV-01',
      soilType: 'Planossolo Háplico',
      area: 92.0,
      perimeter: 3600.0,
      status: 'READY',
      propertyId: propertyAlecsander.id,
    },
  });

  await prisma.fieldMetric.createMany({
    data: monthlyMetrics.map((m) => ({ ...m, fieldId: fieldAlecsander.id })),
  });

  console.log('Database seeded successfully! 🌱');
}

function startSeederWithConfirmation() {
  const args = process.argv.slice(2);
  if (args.includes('--force')) {
    console.log('Flag --force detectada. Iniciando seed sem prompt...');
    return executeSeed();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('--- Sulflux Database Seeder ---');
  console.warn(
    '\n⚠️  ATENÇÃO: Este script irá apagar TODOS os dados das tabelas e substituí-los por dados de teste.',
  );

  rl.question('\nVocê tem certeza que deseja continuar? (y/N) ', (answer) => {
    const confirmed = answer.toLocaleLowerCase().trim();

    if (confirmed === 'y' || confirmed === 'yes') {
      console.log('Confirmação recebida. Iniciando o processo de seed...');
      rl.close();
      executeSeed();
    } else {
      console.log('Operação cancelada pelo usuário.');
      rl.close();
      process.exit(0);
    }
  });
}

function executeSeed() {
  seedDatabase()
    .catch((error) => {
      console.error('Seeder script execution failed: ', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

startSeederWithConfirmation();
