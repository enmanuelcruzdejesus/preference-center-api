import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import envValidation from './config/env.validation';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { User } from './users/entities/user.entity';
import { ConsentEvent } from './events/entities/consent-event.entity';
import { ConsentType } from './events/entities/consent-type.entity';
import { ensureDefaultConsentTypes } from './consents/seed-consent-types';
import { Repository } from 'typeorm';

@Module({
  imports: [
    // Global config + env validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
    }),

    // TypeORM (env-driven)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'consents'),
        entities: [User, ConsentEvent, ConsentType],
        synchronize: config.get<string>('TYPEORM_SYNCHRONIZE', 'true') === 'true', // dev only
        logging: config.get<string>('TYPEORM_LOGGING', 'true') === 'true',
        extra: { max: Number(config.get('DB_POOL_MAX') ?? 10) },
      }),
    }),

    // ⬇️ Make ConsentTypeRepository available in this module (needed for seeding)
    TypeOrmModule.forFeature([ConsentType]),

    UsersModule,
    EventsModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(ConsentType)
    private readonly typesRepo: Repository<ConsentType>,
  ) {}

  async onApplicationBootstrap() {
    await ensureDefaultConsentTypes(this.typesRepo);
  }
}
