import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle WebSocket upgrade requests
  if (request.nextUrl.pathname === '/api/socket') {
    // For now, just pass through - WebSocket will be handled by the client
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/socket',
}
