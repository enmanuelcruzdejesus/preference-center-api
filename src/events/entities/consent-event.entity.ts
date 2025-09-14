import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ConsentType } from '../entities/consent-type.entity';

@Entity('consent_events')
@Index('idx_ev_user_type_created', ['user', 'type', 'createdAt'])
@Index('idx_ev_user_created', ['user', 'createdAt'])
export class ConsentEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => ConsentType, { nullable: false, onDelete: 'RESTRICT' })
  type!: ConsentType;

  @Column({ type: 'boolean' })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
