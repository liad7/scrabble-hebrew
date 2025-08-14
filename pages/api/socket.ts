import type { NextApiRequest, NextApiResponse } from 'next'
import { Server } from 'ws'

type GameMessage = {
  type: 'join' | 'state' | 'ping'
  gameId: string
  payload?: any
}

interface ClientMeta { name?: string; role?: 'host' | 'join' }
interface Room {
  clients: Set<any>
  meta: Map<any, ClientMeta>
}

const rooms = new Map<string, Room>()

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // @ts-ignore augment
  if (!res.socket.server.wss) {
    // @ts-ignore augment
    const server = res.socket.server
    const wss = new Server({ noServer: true })
    // @ts-ignore
    server.wss = wss

    server.on('upgrade', (request: any, socket: any, head: any) => {
      const { url } = request
      if (!url || !url.startsWith('/api/socket')) return
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    })

    wss.on('connection', (ws: any, req: any) => {
      let joinedGameId: string | null = null

      ws.on('message', (data: any) => {
        try {
          const msg = JSON.parse(data.toString()) as GameMessage
          if (msg.type === 'join' && msg.gameId) {
            joinedGameId = msg.gameId
            if (!rooms.has(msg.gameId)) rooms.set(msg.gameId, { clients: new Set(), meta: new Map() })
            const room = rooms.get(msg.gameId)!
            room.clients.add(ws)
            room.meta.set(ws, { name: msg.payload?.name, role: msg.payload?.role })
            // broadcast presence
            const presence = Array.from(room.meta.values())
            room.clients.forEach((client) => {
              if (client.readyState === 1) client.send(JSON.stringify({ type: 'presence', payload: { count: room.clients.size, participants: presence } }))
            })
            return
          }
          if (msg.type === 'state' && msg.gameId) {
            const room = rooms.get(msg.gameId)
            if (room) {
              room.clients.forEach((client) => {
                if (client !== ws && client.readyState === 1) {
                  client.send(JSON.stringify({ type: 'state', payload: msg.payload }))
                }
              })
            }
          }
        } catch {}
      })

      ws.on('close', () => {
        if (joinedGameId && rooms.has(joinedGameId)) {
          const room = rooms.get(joinedGameId)!
          room.clients.delete(ws)
          room.meta.delete(ws)
          if (room.clients.size === 0) rooms.delete(joinedGameId)
          else {
            const presence = Array.from(room.meta.values())
            room.clients.forEach((client) => {
              if (client.readyState === 1) client.send(JSON.stringify({ type: 'presence', payload: { count: room.clients.size, participants: presence } }))
            })
          }
        }
      })
    })
  }

  res.end('OK')
}


