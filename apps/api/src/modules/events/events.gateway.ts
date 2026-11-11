import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { sanitizeRealtimePayload } from '../access/access.rules';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    // Client disconnected
  }

  @SubscribeMessage('join:business')
  handleJoinBusiness() {
    return { status: 'rejected' };
  }

  @SubscribeMessage('join:queue')
  handleJoinQueue() {
    return { status: 'rejected' };
  }

  @SubscribeMessage('join:order')
  handleJoinOrder() {
    return { status: 'rejected' };
  }

  emitQueueUpdate(businessId: string, queueId: string, data: any) {
    if (this.server) {
      const safe = sanitizeRealtimePayload(data);
      this.server.to(`business_${businessId}`).emit('queue:updated', safe);
      this.server.to(`queue_${queueId}`).emit('queue:updated', safe);
    }
  }

  emitOrderUpdate(businessId: string, orderId: string, data: any) {
    if (this.server) {
      const safe = sanitizeRealtimePayload(data);
      this.server.to(`business_${businessId}`).emit('order:updated', safe);
      this.server.to(`order_${orderId}`).emit('order:updated', safe);
    }
  }

  emitNewOrder(businessId: string, data: any) {
    if (this.server) {
      this.server.to(`business_${businessId}`).emit('order:new', sanitizeRealtimePayload(data));
    }
  }
}

