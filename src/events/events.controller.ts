import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dtos/create-event.dto';
import { QueryEventsDto } from './dtos/query-events.dto';
import { PageMeta } from '../common/dtos/pagination.dto';

type EventRow = {
  id: string;
  user: { id: string };
  type: string;        // slug
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
  async create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }
}
