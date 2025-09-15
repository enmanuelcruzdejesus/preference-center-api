import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConsentEvent } from './entities/consent-event.entity';
import { ConsentType } from './entities/consent-type.entity';
import { User } from '../users/entities/user.entity';
import { Repository, ObjectLiteral } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

// ---------- typed helpers / mocks ----------
type RepoMethods<T extends ObjectLiteral = ObjectLiteral> =
  Pick<Repository<T>, 'findOne' | 'find' | 'save' | 'create'>;

type MockRepo<T extends ObjectLiteral = ObjectLiteral> = {
  [K in keyof RepoMethods<T>]: jest.Mock;
};

const repoMock = <T extends ObjectLiteral = ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const cacheMock = () => {
  const store = { del: jest.fn() };
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delete: jest.fn(),
    store,
  };
};

// ---------- tests ----------
describe('EventsService (unit)', () => {
  let service: EventsService;
  let eventsRepo: MockRepo<ConsentEvent>;
  let typesRepo: MockRepo<ConsentType>;
  let usersRepo: MockRepo<User>;
  let cache: ReturnType<typeof cacheMock>;

  beforeEach(async () => {
    eventsRepo = repoMock<ConsentEvent>();
    typesRepo = repoMock<ConsentType>();
    usersRepo = repoMock<User>();
    cache = cacheMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(ConsentEvent), useValue: eventsRepo },
        { provide: getRepositoryToken(ConsentType), useValue: typesRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: CACHE_MANAGER, useValue: cache },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: any) => {
              if (key === 'CONSENT_TYPE_TTL_SEC') return 3600;
              if (key === 'USER_STATE_TTL_SEC') return 300;
              return fallback;
            },
          },
        },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  it('throws 404 if user not found', async () => {
    usersRepo.findOne!.mockResolvedValue(undefined);

    await expect(
      service.create({
        user: { id: 'missing' },
        consents: [{ id: 'email_notifications', enabled: true }],
      } as any)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 422 for unknown consent slugs', async () => {
    usersRepo.findOne!.mockResolvedValue({ id: 'u-1' });
    // cache miss → typesRepo.find([]) returns empty → unknown
    typesRepo.find!.mockResolvedValue([]);

    await expect(
      service.create({
        user: { id: 'u-1' },
        consents: [{ id: 'email_notifications', enabled: true }],
      } as any)
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });



  it('dedupes multiple changes to the same slug within one request (last-write-wins)', async () => {
    usersRepo.findOne!.mockResolvedValue({ id: 'u-1' });
    cache.get.mockResolvedValue(undefined);
    typesRepo.find!.mockResolvedValue([{ id: 't-email', slug: 'email_notifications' }]);

    const created: any[] = [];
    eventsRepo.create!.mockImplementation((v) => {
      created.push(v);
      return v;
    });
    eventsRepo.save!.mockImplementation((rows) =>
      Promise.resolve(rows.map((r: any, i: number) => ({ ...r, id: `e-${i}`, createdAt: new Date() })))
    );

    await service.create({
      user: { id: 'u-1' },
      consents: [
        { id: 'email_notifications', enabled: true },
        { id: 'email_notifications', enabled: false }, // last one should win if you dedupe
      ],
    } as any);

    // If your implementation dedupes per slug before saving:
    expect(created.filter((c) => c.type.slug === 'email_notifications')).toHaveLength(1);
  });
});
