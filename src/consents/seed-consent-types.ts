import { Repository } from 'typeorm';
import { ConsentType } from '../events/entities/consent-type.entity';

export async function ensureDefaultConsentTypes(repo: Repository<ConsentType>) {
  const required = [
    { slug: 'email_notifications', name: 'Email notifications' },
    { slug: 'sms_notifications', name: 'SMS notifications' },
  ];
  const slugs = required.map((r) => r.slug);
  const existing = await repo
    .createQueryBuilder('t')
    .where('t.slug IN (:...slugs)', { slugs })
    .getMany();
  const have = new Set(existing.map((e) => e.slug));
  const toCreate = required
    .filter((r) => !have.has(r.slug))
    .map((r) => repo.create(r));
  if (toCreate.length) await repo.save(toCreate);
}
