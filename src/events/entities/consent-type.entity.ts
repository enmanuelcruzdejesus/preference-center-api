import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('consent_types')
@Unique(['slug'])
export class ConsentType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // e.g. "email_notifications", "sms_notifications"
  @Column({ type: 'varchar', length: 120 })
  slug!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
