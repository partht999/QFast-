import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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
  handleJoinBusiness(client: Socket, businessId: string) {
    client.join(`business_${businessId}`);
    return { status: 'joined', room: `business_${businessId}` };
  }

  @SubscribeMessage('join:queue')
  handleJoinQueue(client: Socket, queueId: string) {
    client.join(`queue_${queueId}`);
    return { status: 'joined', room: `queue_${queueId}` };
  }

  @SubscribeMessage('join:order')
  handleJoinOrder(client: Socket, orderId: string) {
    client.join(`order_${orderId}`);
    return { status: 'joined', room: `order_${orderId}` };
  }

  emitQueueUpdate(businessId: string, queueId: string, data: any) {
    if (this.server) {
      this.server.to(`business_${businessId}`).emit('queue:updated', data);
      this.server.to(`queue_${queueId}`).emit('queue:updated', data);
    }
  }

  emitOrderUpdate(businessId: string, orderId: string, data: any) {
    if (this.server) {
      this.server.to(`business_${businessId}`).emit('order:updated', data);
      this.server.to(`order_${orderId}`).emit('order:updated', data);
    }
  }

  emitNewOrder(businessId: string, data: any) {
    if (this.server) {
      this.server.to(`business_${businessId}`).emit('order:new', data);
    }
  }
}

