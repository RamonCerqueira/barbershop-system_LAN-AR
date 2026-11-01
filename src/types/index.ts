export interface ServiceCost {
  id: string
  serviceId: string
  itemName: string
  item?: string
  costPerUse: number
  unit: string
  supplier?: string | null
  isActive?: boolean
}

export interface ServiceAnalysis {
  id: string
  name: string
  category: string
  price: number
  duration: number
  totalRevenue: number
  totalAppointments: number
  averagePrice: number
  revenuePercentage: number
  appointmentsPercentage: number
  profitMargin: number
  abcClass: 'A' | 'B' | 'C'
  trend: 'up' | 'down' | 'stable'
  costs: ServiceCost[]
  totalCostPerService: number
  netProfit: number
}

export interface WhatsAppCampaign {
  id: string
  name: string
  message: string
  messageTemplate?: string
  triggerDays: number
  recurrenceInterval?: number
  lastSent?: string | Date | null
  isActive: boolean
  companyId?: string
  createdAt?: string | Date
  totalSent: number
  responses: number
  conversions: number
}

export interface WhatsAppCampaignLog {
  id: string
  campaignId: string
  campaignName?: string
  clientId: string
  clientName?: string
  clientPhone?: string
  message?: string
  sentAt: string | Date
  status: 'SENT' | 'DELIVERED' | 'READ' | 'REPLIED' | 'FAILED'
  response?: string | null
  errorMessage?: string | null
}
