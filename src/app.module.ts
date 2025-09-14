import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import envValidation from './config/env.validation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { User } from './users/entities/user.entity';
import { ConsentEvent } from './events/entities/consent-event.entity';
import { ConsentType } from './events/entities/consent-type.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [User, ConsentEvent, ConsentType],
        synchronize: true,
      }),
    }),
    UsersModule,
    EventsModule,
  ],
  providers: [],
})
export class AppModule {}
