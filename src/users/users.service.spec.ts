import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ConsentEvent } from '../events/entities/consent-event.entity';
import { Repository, ObjectLiteral } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

// --- Typed repo mocks (T must extend ObjectLiteral) ---
type RepoMethods<T extends ObjectLiteral = ObjectLiteral> =
  Pick<Repository<T>, 'findOne' | 'findAndCount' | 'save' | 'create' | 'delete' | 'createQueryBuilder'>;

type MockRepo<T extends ObjectLiteral = ObjectLiteral> = {
  [K in keyof RepoMethods<T>]: jest.Mock;
};

const repoMock = <T extends ObjectLiteral = ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// Cache mock
const cacheMock = () => {
  const store = { del: jest.fn() };
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),      // some adapters expose del at top level
    delete: jest.fn(),   // some expose delete instead
    store,
  };
};

// QueryBuilder mock
const qbMock = <T extends ObjectLiteral = ObjectLiteral>(rows: T[]) => {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
};

// ---------- tests ----------
describe('UsersService (unit)', () => {
  let service: UsersService;
  let usersRepo: MockRepo<User>;
  let eventsRepo: MockRepo<ConsentEvent>;
  let cache: ReturnType<typeof cacheMock>;
  let config: ConfigService;

  beforeEach(async () => {
    usersRepo = repoMock<User>();
    eventsRepo = repoMock<ConsentEvent>();
    cache = cacheMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(ConsentEvent), useValue: eventsRepo },
        { provide: CACHE_MANAGER, useValue: cache },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: any) => {
              if (key === 'USER_STATE_TTL_SEC') return 300;
              return fallback;
            },
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    config = module.get(ConfigService);
  });

  it('throws 422 if email already exists', async () => {
    usersRepo.findOne!.mockResolvedValue({ id: 'u-1', email: 'john@example.com' });

    await expect(service.create({ email: 'john@example.com' } as any))
      .rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('throws 404 on delete when user not found; invalidates cache otherwise', async () => {
    usersRepo.delete!.mockResolvedValue({ affected: 0 });
    await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);

    usersRepo.delete!.mockResolvedValue({ affected: 1 });
    await expect(service.remove('u-1')).resolves.toBeUndefined();

    // deletion helper supports del/delete/store.del — assert one of them fired
    expect(cache.del.mock.calls.length + cache.delete.mock.calls.length + cache.store.del.mock.calls.length)
      .toBeGreaterThan(0);
  });
});
