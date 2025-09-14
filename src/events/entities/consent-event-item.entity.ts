import { Check, Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConsentEvent } from './consent-event.entity';
import { ConsentId } from '../../consents/consents.enum';

@Entity('consent_event_items')
@Check(`"consentId" IN ('email_notifications','sms_notifications')`)
@Index(['consentId', 'event'], { unique: false })
export class ConsentEventItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ConsentEvent, e => e.items, { nullable: false, onDelete: 'CASCADE' })
  event!: ConsentEvent;

  @Index()
  @Column({ type: 'varchar' })
  consentId!: ConsentId;

  @Column({ type: 'boolean' })
  enabled!: boolean;
}
