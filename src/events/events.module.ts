import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { ConsentEvent } from './entities/consent-event.entity';
import { ConsentType } from './entities/consent-type.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConsentEvent, ConsentType, User])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
