import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateEventDto } from './dtos/create-event.dto';
import { User } from '../users/entities/user.entity';
import { ConsentType } from './entities/consent-type.entity';
import { ConsentEvent } from './entities/consent-event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ConsentEvent) private readonly eventsRepo: Repository<ConsentEvent>,
    @InjectRepository(ConsentType)  private readonly typesRepo: Repository<ConsentType>,
    @InjectRepository(User)         private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateEventDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.user.id } });
    if (!user) throw new NotFoundException('user not found');

    // Resolve all slugs
    const slugs = dto.consents.map(c => c.id);
    const types  = await this.typesRepo.find({ where: { slug: In(slugs) } });
    const bySlug = new Map(types.map(t => [t.slug, t]));

    const missing = slugs.filter(s => !bySlug.has(s));
    if (missing.length) {
      throw new UnprocessableEntityException(missing.map(s => ({
        property: 'consents.id',
        constraints: { exists: `unknown consent id: ${s}` },
      })));
    }

    // Create one row per consent change (the row IS the event)
    const rows = dto.consents.map(c =>
      this.eventsRepo.create({ user, type: bySlug.get(c.id)!, enabled: c.enabled })
    );

    const saved = await this.eventsRepo.save(rows);

    return {
      // Return a logical "batch" response (not a header id)
      user: { id: user.id },
      consents: saved.map(r => ({ id: (r.type as ConsentType).slug, enabled: r.enabled })),
      createdAt: saved[0]?.createdAt, // first insert timestamp (all within same second)
    };
  }
}
