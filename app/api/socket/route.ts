import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // This is a WebSocket upgrade endpoint
  // The actual WebSocket handling is done in the middleware
  return new Response('WebSocket endpoint', { status: 200 })
}

export async function POST(req: NextRequest) {
  return new Response('Method not allowed', { status: 405 })
}
