import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateEventDto } from './dtos/create-event.dto';
import { QueryEventsDto } from './dtos/query-events.dto';
import { User } from '../users/entities/user.entity';
import { ConsentType } from './entities/consent-type.entity';
import { ConsentEvent } from './entities/consent-event.entity';
import { buildMeta } from '../common/dtos/pagination.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { CacheKeys } from 'src/common/cache/cache.keys';

@Injectable()
export class EventsService {
  private readonly consentTypeTtlSec: number;
  private readonly userStateTtlSec: number; // kept for symmetry/diagnostics

  constructor(
    @InjectRepository(ConsentEvent)
    private readonly eventsRepo: Repository<ConsentEvent>,
    @InjectRepository(ConsentType)
    private readonly typesRepo: Repository<ConsentType>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
  ) {
    this.consentTypeTtlSec = Number(
      this.config.get('CONSENT_TYPE_TTL_SEC', 3600),
    );
    this.userStateTtlSec = Number(this.config.get('USER_STATE_TTL_SEC', 300));
  }

  async list(
    query: QueryEventsDto,
  ): Promise<{ data: any[]; meta: ReturnType<typeof buildMeta> }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.eventsRepo
      .createQueryBuilder('e')
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
    if (query.type) qb.andWhere('type.slug = :slug', { slug: query.type });

    const total = await qb.getCount();

    const rows = await qb
      .orderBy('e.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany<{
        id: string;
        userId: string;
        slug: string;
        enabled: 0 | 1;
        createdAt: Date;
      }>();

    const data = rows.map((r) => ({
      id: r.id,
      user: { id: r.userId },
      type: r.slug,
      enabled: !!r.enabled,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
    }));

    return { data, meta: buildMeta(total, page, limit) };
  }

  async create(dto: CreateEventDto) {
    const user = await this.usersRepo.findOne({ where: { id: dto.user.id } });
    if (!user) throw new NotFoundException('user not found');

    const slugs = dto.consents.map((c) => c.id);
    const bySlug = await this.resolveTypes(slugs);
    const missing = slugs.filter((s) => !bySlug.has(s));
    if (missing.length) {
      throw new UnprocessableEntityException(
        missing.map((s) => ({
          property: 'consents.id',
          constraints: { exists: `unknown consent id: ${s}` },
        })),
      );
    }

    // Optional: dedupe within one batch (last-write-wins per slug)
    const latest = new Map<string, boolean>();
    for (const c of dto.consents) latest.set(c.id, c.enabled);

    const rows = Array.from(latest.entries()).map(([slug, enabled]) =>
      this.eventsRepo.create({ user, type: bySlug.get(slug)!, enabled }),
    );
    const saved = await this.eventsRepo.save(rows);

    // 🔥 Invalidate this user's cached state across all replicas
    await this.cache.del(CacheKeys.userState(user.id));

    return {
      user: { id: user.id },
      consents: saved.map((r) => ({
        id: (r.type as ConsentType).slug,
        enabled: r.enabled,
      })),
      createdAt: saved[0]?.createdAt,
    };
  }

  private async resolveTypes(
    slugs: string[],
  ): Promise<Map<string, ConsentType>> {
    const unique = Array.from(new Set(slugs));
    const map = new Map<string, ConsentType>();
    const misses: string[] = [];

    // Try cache per slug
    for (const slug of unique) {
      const cached = await this.cache.get<Pick<ConsentType, 'id' | 'slug'>>(
        CacheKeys.consentTypeBySlug(slug),
      );
      if (cached) {
        map.set(slug, cached as ConsentType);
      } else {
        misses.push(slug);
      }
    }

    if (misses.length) {
      const rows = await this.typesRepo.find({ where: { slug: In(misses) } });
      for (const r of rows) {
        map.set(r.slug, r);
        await this.cache.set(
          CacheKeys.consentTypeBySlug(r.slug),
          { id: r.id, slug: r.slug },
          this.consentTypeTtlSec,
        );
      }
    }

    return map;
  }
}
