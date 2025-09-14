import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateEventDto } from './dtos/create-event.dto';
import { QueryEventsDto } from './dtos/query-events.dto';
import { User } from '../users/entities/user.entity';
import { ConsentType } from './entities/consent-type.entity';
import { ConsentEvent } from './entities/consent-event.entity';
import { buildMeta } from '../common/dtos/pagination.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ConsentEvent) private readonly eventsRepo: Repository<ConsentEvent>,
    @InjectRepository(ConsentType)  private readonly typesRepo: Repository<ConsentType>,
    @InjectRepository(User)         private readonly usersRepo: Repository<User>,
  ) {}

  async list(query: QueryEventsDto): Promise<{ data: any[]; meta: ReturnType<typeof buildMeta> }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.eventsRepo.createQueryBuilder('e')
      .innerJoin('e.user', 'user')
      .innerJoin('e.type', 'type')
      .select([
        'e.id AS id',
        'user.id AS userId',
        'type.slug AS slug',
        'e.enabled AS enabled',
        'e.createdAt AS createdAt',
      ]);

    if (query.userId) qb.andWhere('user.id = :uid', { uid: query.userId });
    if (query.type)   qb.andWhere('type.slug = :slug', { slug: query.type });

    const total = await qb.getCount();

    const rows = await qb
      .orderBy('e.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany<{ id: string; userId: string; slug: string; enabled: 0 | 1; createdAt: Date }>();

    const data = rows.map(r => ({
      id: r.id,
      user: { id: r.userId },
      type: r.slug,
      enabled: !!r.enabled,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));

    return { data, meta: buildMeta(total, page, limit) };
  }

  async create(dto: CreateEventDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.user.id } });
    if (!user) throw new NotFoundException('user not found');

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

    const rows = dto.consents.map(c =>
      this.eventsRepo.create({ user, type: bySlug.get(c.id)!, enabled: c.enabled })
    );
    const saved = await this.eventsRepo.save(rows);

    return {
      user: { id: user.id },
      consents: saved.map(r => ({ id: (r.type as ConsentType).slug, enabled: r.enabled })),
      createdAt: saved[0]?.createdAt,
    };
  }
}
