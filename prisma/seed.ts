import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') throw new Error('Seed demo desativado. Use bootstrap administrativo.')
  if (!process.env.DEMO_ADMIN_PASSWORD || !process.env.DEMO_COMPANY_PASSWORD) throw new Error('Configure senhas individuais de demonstração.')
  console.log('Iniciando seed do banco de dados PostgreSQL (BarberPro)...')

  const adminPassword = await bcrypt.hash(process.env.DEMO_ADMIN_PASSWORD!, 12)
  const demoPassword = await bcrypt.hash(process.env.DEMO_COMPANY_PASSWORD!, 12)

  // 1. Criar SystemOwner (Super Admin)
  const systemOwner = await prisma.systemOwner.upsert({
    where: { email: 'admin@barberpro.com' },
    update: {
      name: 'Administrador Geral BarberPro',
      password: adminPassword,
    },
    create: {
      email: 'admin@barberpro.com',
      name: 'Administrador Geral BarberPro',
      password: adminPassword,
    },
  })
  console.log('SystemOwner configurado:', systemOwner.email)

  // 2. Criar Empresa (Barbearia Demo)
  const company = await prisma.company.upsert({
    where: { email: 'demo@barberpro.com' },
    update: {
      name: 'Barbearia BarberPro Elite',
      isActive: true,
    },
    create: {
      name: 'Barbearia BarberPro Elite',
      email: 'demo@barberpro.com',
      cpf: '123.456.789-00',
      fullName: 'Carlos Silva',
      birthDate: new Date('1988-05-15'),
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100',
      phone: '(11) 99999-9999',
      plan: 'MONTHLY',
      planPrice: 10.0,
      isActive: true,
    },
  })
  console.log('Empresa configurada:', company.name)

  // 3. Criar Usuário Admin da Barbearia
  await prisma.user.upsert({
    where: { email: 'demo@barberpro.com' },
    update: {
      password: demoPassword,
      companyId: company.id,
      isActive: true,
    },
    create: {
      email: 'demo@barberpro.com',
      password: demoPassword,
      name: 'Carlos Silva',
      role: 'ADMIN',
      companyId: company.id,
      isActive: true,
    },
  })

  // 4. Criar CompanySettings padrão
  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      businessHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '19:00', breakStart: '12:00', breakEnd: '13:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '19:00', breakStart: '12:00', breakEnd: '13:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '19:00', breakStart: '12:00', breakEnd: '13:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00', breakStart: '12:00', breakEnd: '13:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '20:00', breakStart: '12:00', breakEnd: '13:00' },
        saturday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '14:00', breakStart: '12:00', breakEnd: '13:00' },
      },
      appointmentConfig: {
        slotDuration: 30,
        advanceBookingDays: 30,
        cancellationDeadline: 2,
        autoConfirm: false,
        allowOnlinePayment: true,
        requireDeposit: false,
        depositPercentage: 20,
      },
      whatsappConfig: {
        apiUrl: 'https://api.whatsapp.com',
        apiToken: '',
        phoneNumber: '5511999999999',
        autoSendConfirmation: true,
        autoSendReminder: true,
        reminderHours: 24,
      },
      locationConfig: {
        latitude: -23.5614,
        longitude: -46.6558,
        googleMapsApiKey: '',
        showOnMap: true,
        deliveryRadius: 5,
      },
      notificationConfig: {
        emailNotifications: true,
        smsNotifications: false,
        whatsappNotifications: true,
        pushNotifications: true,
        notifyNewAppointments: true,
        notifyCancellations: true,
        notifyPayments: true,
        notifyLowStock: true,
      },
    },
  })

  // 5. Criar Serviços iniciais se não existirem
  const existingServices = await prisma.service.count({ where: { companyId: company.id } })
  if (existingServices === 0) {
    const s1 = await prisma.service.create({
      data: {
        name: 'Corte Degradê Navalhado',
        description: 'Corte moderno com acabamento na navalha e finalização com pomada',
        category: 'Cabelo',
        price: 45.0,
        duration: 40,
        companyId: company.id,
        serviceCosts: {
          create: [
            { itemName: 'Lâmina Descartável', costPerUse: 1.5, unit: 'unidade', supplier: 'BarberShop Supply' },
            { itemName: 'Pomada Modeladora', costPerUse: 2.0, unit: 'g', supplier: 'BarberShop Supply' },
          ],
        },
      },
    })

    await prisma.service.create({
      data: {
        name: 'Barba Terapia com Toalha Quente',
        description: 'Modelagem de barba com toalha quente, óleo essencial e massagem facial',
        category: 'Barba',
        price: 35.0,
        duration: 30,
        companyId: company.id,
        serviceCosts: {
          create: [
            { itemName: 'Espuma de Barbear', costPerUse: 1.8, unit: 'ml', supplier: 'Cosméticos Pro' },
            { itemName: 'Loção Pós-Barba', costPerUse: 2.2, unit: 'ml', supplier: 'Cosméticos Pro' },
          ],
        },
      },
    })

    const s3 = await prisma.service.create({
      data: {
        name: 'Combo Corte + Barba + Sobrancelha',
        description: 'Pacote completo de visual masculino',
        category: 'Combo',
        price: 75.0,
        duration: 60,
        companyId: company.id,
        serviceCosts: {
          create: [
            { itemName: 'Kit Lâminas + Shaving', costPerUse: 4.5, unit: 'kit', supplier: 'BarberShop Supply' },
          ],
        },
      },
    })

    // 6. Criar Colaboradores
    const e1 = await prisma.employee.create({
      data: {
        name: 'Pedro Barbeiro Master',
        email: 'pedro@barberpro.com',
        phone: '(11) 98888-1111',
        role: 'BARBER',
        salary: 2500.0,
        commissionRate: 40.0,
        hireDate: new Date('2023-02-01'),
        companyId: company.id,
        specialties: {
          create: [
            { specialty: 'Corte', level: 'EXPERT' },
            { specialty: 'Barba', level: 'EXPERT' },
            { specialty: 'Sobrancelha', level: 'ADVANCED' },
          ],
        },
      },
    })

    const e2 = await prisma.employee.create({
      data: {
        name: 'Lucas Fade Specialist',
        email: 'lucas@barberpro.com',
        phone: '(11) 98888-2222',
        role: 'BARBER',
        salary: 2200.0,
        commissionRate: 35.0,
        hireDate: new Date('2024-01-10'),
        companyId: company.id,
        specialties: {
          create: [
            { specialty: 'Corte Livre', level: 'EXPERT' },
            { specialty: 'Tintura', level: 'ADVANCED' },
          ],
        },
      },
    })

    // 7. Criar Clientes
    const c1 = await prisma.client.create({
      data: {
        fullName: 'João Victor Almeida',
        phone: '(11) 97777-1234',
        email: 'joao@email.com',
        address: 'Rua Augusta, 500 - São Paulo, SP',
        birthDate: new Date('1995-08-20'),
        totalVisits: 5,
        totalSpent: 285.0,
        rating: 5.0,
        companyId: company.id,
      },
    })

    const c2 = await prisma.client.create({
      data: {
        fullName: 'Rafael Mendonça',
        phone: '(11) 97777-5678',
        email: 'rafael@email.com',
        address: 'Rua Oscar Freire, 200 - São Paulo, SP',
        birthDate: new Date('1990-03-12'),
        totalVisits: 3,
        totalSpent: 155.0,
        rating: 4.8,
        companyId: company.id,
      },
    })

    // 8. Criar Produtos
    await prisma.product.createMany({
      data: [
        {
          name: 'Cerveja Artesanal IPA 355ml',
          description: 'Cerveja gelada para consumo na barbearia',
          category: 'BEVERAGES',
          price: 14.0,
          stock: 24,
          minStock: 6,
          companyId: company.id,
        },
        {
          name: 'Refrigerante Lata 350ml',
          description: 'Coca-Cola ou Guaraná gelado',
          category: 'BEVERAGES',
          price: 6.0,
          stock: 30,
          minStock: 10,
          companyId: company.id,
        },
        {
          name: 'Pomada Efeito Matte 120g',
          description: 'Pomada modeladora de alta fixação',
          category: 'OTHER',
          price: 45.0,
          stock: 12,
          minStock: 5,
          companyId: company.id,
        },
      ],
    })

    // 9. Criar Agendamentos para hoje
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    const apt1 = await prisma.appointment.create({
      data: {
        date: today,
        time: '10:00',
        status: 'COMPLETED',
        price: s3.price,
        notes: 'Cliente prefere degradê médio',
        clientId: c1.id,
        serviceId: s3.id,
        employeeId: e1.id,
        companyId: company.id,
      },
    })

    await prisma.appointment.create({
      data: {
        date: today,
        time: '14:30',
        status: 'CONFIRMED',
        price: s1.price,
        notes: 'Confirmado via WhatsApp',
        clientId: c2.id,
        serviceId: s1.id,
        employeeId: e2.id,
        companyId: company.id,
      },
    })

    // 10. Criar Venda real vinculada ao agendamento concluído
    await prisma.sale.create({
      data: {
        type: 'SERVICE',
        description: `${s3.name} - ${c1.fullName}`,
        amount: s3.price,
        paymentMethod: 'PIX',
        status: 'COMPLETED',
        appointmentId: apt1.id,
        clientId: c1.id,
        companyId: company.id,
      },
    })

    // 11. Criar Campanha WhatsApp inicial
    await prisma.whatsAppCampaign.create({
      data: {
        name: 'Lembrete de Retorno 20 Dias',
        message: 'Olá {nome}! Já faz {dias} dias desde seu último trato no visual na {barbearia}. Que tal agendar seu horário desta semana?',
        triggerDays: 20,
        isActive: true,
        companyId: company.id,
      },
    })

    // 12. Criar Notificação inicial
    await prisma.notification.create({
      data: {
        title: 'Sistema BarberPro Ativo',
        message: 'Bem-vindo ao BarberPro conectado ao PostgreSQL!',
        type: 'SYSTEM',
        companyId: company.id,
      },
    })
  }

  console.log('Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
