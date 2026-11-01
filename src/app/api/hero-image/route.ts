import { NextRequest, NextResponse } from 'next/server'
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/hero-barber-banner.jpg',request.url),308)
}
