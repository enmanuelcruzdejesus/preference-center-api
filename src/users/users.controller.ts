import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserResponseDTO } from './dtos/user-response.dto';
import { QueryUsersDto } from './dtos/query-users.dto';
import { PageMeta } from '../common/dtos/pagination.dto';
import { ApiOperation } from '@nestjs/swagger';

type UsersPage = { data: UserResponseDTO[]; meta: PageMeta };

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List users (paginated)' })
  @Get()
  async list(@Query() query: QueryUsersDto): Promise<UsersPage> {
    return this.usersService.findPage(query);
  }

  @ApiOperation({ summary: 'Get user by ID with current consents' })
  @Get(':id')
  async get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<UserResponseDTO> {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDTO> {
    return this.usersService.create(dto);
  }


  @ApiOperation({ summary: 'Delete user' })
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.usersService.remove(id);
  }
}
