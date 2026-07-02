import { Module } from '@nestjs/common';

import { ChatGateway } from './gateways/chat.gateway';
import { NotificationsGateway } from './gateways/notifications.gateway';

@Module({
  providers: [NotificationsGateway, ChatGateway],
  exports: [NotificationsGateway, ChatGateway],
})
export class RealtimeModule {}
