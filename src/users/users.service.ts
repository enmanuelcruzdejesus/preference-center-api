import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entity';
import { UserResponseDTO } from './dtos/user-response.dto';
import { ConsentEvent } from '../events/entities/consent-event.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)        private readonly usersRepo: Repository<User>,
    @InjectRepository(ConsentEvent)private readonly eventsRepo: Repository<ConsentEvent>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDTO> {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) {
      throw new UnprocessableEntityException([{ property: 'email', constraints: { unique: 'email must be unique' } }]);
    }
    const saved = await this.usersRepo.save(this.usersRepo.create({ email: dto.email }));
    return { id: saved.id, email: saved.email, consents: [] };
  }

  async findAll(): Promise<UserResponseDTO[]> {
    const users = await this.usersRepo.find({ order: { createdAt: 'ASC' } });
    return Promise.all(users.map(u => this.getUserWithConsents(u.id)));
  }

  async findOne(id: string): Promise<UserResponseDTO> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return this.getUserWithConsents(id);
  }

  async remove(id: string): Promise<void> {
    const res = await this.usersRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException('user not found');
  }

  private async getUserWithConsents(userId: string): Promise<UserResponseDTO> {
    // Pull all (type.slug, enabled) for this user ordered by slug asc, createdAt desc
    const rows = await this.eventsRepo.createQueryBuilder('e')
      .innerJoin('e.user', 'user')
      .innerJoin('e.type', 'type')
      .select(['type.slug AS slug', 'e.enabled AS enabled', 'e.createdAt AS createdAt'])
      .where('user.id = :userId', { userId })
      .orderBy('type.slug', 'ASC')
      .addOrderBy('e.createdAt', 'DESC')
      .getRawMany<{ slug: string; enabled: 0 | 1; createdAt: string }>();

    const seen = new Set<string>();
    const consents: { id: string; enabled: boolean }[] = [];
    for (const r of rows) {
      if (!seen.has(r.slug)) {
        seen.add(r.slug);
        consents.push({ id: r.slug, enabled: !!r.enabled });
      }
    }

    const user = await this.usersRepo.findOneOrFail({ where: { id: userId } });
    return { id: user.id, email: user.email, consents };
  }
}
