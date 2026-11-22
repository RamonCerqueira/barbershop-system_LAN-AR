export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(b.latitude - a.latitude), dLon = radians(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)))
}
export function isShopOpen(hours: Record<string, { isOpen?: boolean; openTime?: string; closeTime?: string; breakStart?: string; breakEnd?: string }>, now = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(now).toLowerCase()
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  const config = hours[day]
  return Boolean(config?.isOpen && config.openTime && config.closeTime && time >= config.openTime && time < config.closeTime && !(config.breakStart && config.breakEnd && time >= config.breakStart && time < config.breakEnd))
}
