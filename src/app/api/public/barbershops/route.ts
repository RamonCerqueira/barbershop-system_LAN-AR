import { isShopOpen } from '@/lib/shop-discovery'
import { evaluateCompanySubscription } from '@/lib/subscription'
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
        photos: { orderBy: { createdAt: 'asc' } },
        customerReviews: { select: { rating: true } },
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

    const formatted = companies
      .filter((company) => (company.settings?.locationConfig as any)?.showOnMap !== false)
      .map((company) => {
      const ratings = company.customerReviews
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

      const bh = (company.settings?.businessHours || {}) as Record<string, { isOpen?: boolean; openTime?: string; closeTime?: string; breakStart?: string; breakEnd?: string }>
      const isOpenToday = isShopOpen(bh)

      const loc = (company.settings?.locationConfig as any) || {}

      return {
        id: company.id,
        logoUrl: company.logoPath ? `/api/public/barbershops/${company.id}/logo?v=${company.logoPath}` : null,
        photos: company.photos.map(photo => `/api/public/barbershops/${company.id}/photos/${photo.id}`),
        bookingAvailable: evaluateCompanySubscription(company).hasAccess,
        name: company.name,
        address: company.address,
        city: loc.city || '',
        neighborhood: loc.neighborhood || '',
        latitude: typeof loc.latitude === 'number' ? loc.latitude : null,
        longitude: typeof loc.longitude === 'number' ? loc.longitude : null,
        amenities: Array.isArray(loc.amenities) ? loc.amenities : [],
        acceptedPayments: Array.isArray(loc.acceptedPayments) ? loc.acceptedPayments : [],
        instagram: loc.instagram || '',
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

