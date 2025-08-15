const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Game rooms management
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentGameId = null;
  let playerInfo = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'join') {
        currentGameId = data.gameId;
        playerInfo = data.payload;
        
        if (!rooms.has(currentGameId)) {
          rooms.set(currentGameId, {
            clients: new Map(),
            gameState: null,
            lastUpdate: Date.now()
          });
        }
        
        const room = rooms.get(currentGameId);
        
        // Check if player is already connected
        const isPlayerAlreadyConnected = Array.from(room.clients.values()).some(
          existingPlayer => existingPlayer.name === playerInfo.name && existingPlayer.role === playerInfo.role
        );
        
        if (isPlayerAlreadyConnected) {
          console.log(`Player ${playerInfo.name} (${playerInfo.role}) already connected to game ${currentGameId}`);
          return;
        }
        
        // Limit to 2 players per game
        if (room.clients.size >= 2) {
          console.log(`Game ${currentGameId} is full, rejecting ${playerInfo.name} (${playerInfo.role})`);
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Game is full' }
          }));
          return;
        }
        
        room.clients.set(ws, playerInfo);
        
        // Broadcast presence update
        broadcastToRoom(currentGameId, {
          type: 'presence',
          payload: {
            count: room.clients.size,
            participants: Array.from(room.clients.values())
          }
        }, ws);
        
        console.log(`Player ${playerInfo.name} (${playerInfo.role}) joined game ${currentGameId}`);
      }
      
      if (data.type === 'state') {
        const room = rooms.get(currentGameId);
        if (room) {
          room.gameState = data.payload;
          room.lastUpdate = Date.now();
          
          // Broadcast state to other players
          broadcastToRoom(currentGameId, {
            type: 'state',
            payload: data.payload
          }, ws);
        }
      }
      
      if (data.type === 'action') {
        const room = rooms.get(currentGameId);
        if (room) {
          // Broadcast action to other players
          broadcastToRoom(currentGameId, {
            type: 'action',
            payload: data.payload
          }, ws);
        }
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentGameId && rooms.has(currentGameId)) {
      const room = rooms.get(currentGameId);
      room.clients.delete(ws);
      
      if (room.clients.size === 0) {
        rooms.delete(currentGameId);
        console.log(`Game ${currentGameId} ended - no players left`);
      } else {
        // Broadcast updated presence
        broadcastToRoom(currentGameId, {
          type: 'presence',
          payload: {
            count: room.clients.size,
            participants: Array.from(room.clients.values())
          }
        });
      }
    }
  });
});

function broadcastToRoom(gameId, message, excludeWs = null) {
  const room = rooms.get(gameId);
  if (room) {
    room.clients.forEach((playerInfo, client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
