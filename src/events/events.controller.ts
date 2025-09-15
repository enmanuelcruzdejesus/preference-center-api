import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dtos/create-event.dto';
import { QueryEventsDto } from './dtos/query-events.dto';
import { PageMeta } from '../common/dtos/pagination.dto';
import { Throttle } from '@nestjs/throttler';

type EventRow = {
  id: string;
  user: { id: string };
  type: string; // slug
  enabled: boolean;
  createdAt: string;
};
type EventsPage = { data: EventRow[]; meta: PageMeta };

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async list(@Query() query: QueryEventsDto): Promise<EventsPage> {
    return this.eventsService.list(query);
  }

  @Post()
  @Throttle({
    limit: parseInt(process.env.RL_EVENTS_LIMIT || '10', 10),
    ttl: parseInt(process.env.RL_EVENTS_TTL_SEC || '60', 10),
  } as any)
  async create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }
}
