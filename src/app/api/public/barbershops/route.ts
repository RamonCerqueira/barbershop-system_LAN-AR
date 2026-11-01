import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''

    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { services: { some: { name: { contains: search, mode: 'insensitive' } } } }
            ]
          }
          : {})
      },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        },
        employees: {
          where: { isActive: true }
        },
        clients: {
          select: { rating: true }
        },
        settings: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const formatted = companies.map((company) => {
      const ratings = company.clients
        .map((c) => c.rating)
        .filter((r): r is number => typeof r === 'number')
      const avgRating =
        ratings.length > 0
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : 0

      const minPrice =
        company.services.length > 0 ? Number(company.services[0].price) : 35
      const maxPrice =
        company.services.length > 0
          ? Number(company.services[company.services.length - 1].price)
          : 80

      const priceRange =
        minPrice <= 35 ? 'R$ 25-50' : maxPrice <= 70 ? 'R$ 35-70' : 'R$ 45-100'

      const dayKeys = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
      ]
      const todayKey = dayKeys[new Date().getDay()]
      const bh = (company.settings?.businessHours as any) || {}
      const isOpenToday = bh[todayKey] ? bh[todayKey].isOpen !== false : true

      return {
        id: company.id,
        name: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        rating: avgRating,
        reviewCount: ratings.length,
        priceRange,
        isOpen: isOpenToday,
        services: company.services.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration,
          category: s.category
        })),
        employeesCount: company.employees.length
      }
    })

    return jsonResponse(formatted)
  } catch (error) {
    console.error('Erro ao buscar barbearias públicas:', error)
    return jsonResponse({ error: 'Erro ao buscar barbearias' }, { status: 500 })
  }
}

