import { NextRequest } from 'next/server'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { publicBoard } from '@/lib/waiting-room'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    return jsonResponse(await publicBoard((await params).token), { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' } })
  } catch (error) { return apiError(error) }
}
