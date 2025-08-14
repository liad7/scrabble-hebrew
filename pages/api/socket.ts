import type { NextApiRequest, NextApiResponse } from 'next'
import { Server } from 'ws'

type GameMessage = {
  type: 'join' | 'state' | 'ping'
  gameId: string
  payload?: any
}

const rooms = new Map<string, Set<any>>()

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
            if (!rooms.has(msg.gameId)) rooms.set(msg.gameId, new Set())
            rooms.get(msg.gameId)!.add(ws)
            return
          }
          if (msg.type === 'state' && msg.gameId) {
            const conns = rooms.get(msg.gameId)
            if (conns) {
              conns.forEach((client) => {
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
          rooms.get(joinedGameId)!.delete(ws)
          if (rooms.get(joinedGameId)!.size === 0) rooms.delete(joinedGameId)
        }
      })
    })
  }

  res.end('OK')
}


