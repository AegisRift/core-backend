import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    const userId = String(client.handshake.auth?.userId ?? 'anonymous');
    client.join(`user:${userId}`);
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
