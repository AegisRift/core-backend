import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join-room')
  handleJoin(client: Socket, @MessageBody() roomId: string): void {
    client.join(`chat:${roomId}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    _client: Socket,
    @MessageBody() payload: { roomId: string; message: string },
  ): void {
    this.server.to(`chat:${payload.roomId}`).emit('message', payload);
  }
}
