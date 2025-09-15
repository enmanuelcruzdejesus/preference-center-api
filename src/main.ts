import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform-interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  // app.useGlobalGuards(app.get(ThrottlerGuard));

  const prefix = config.get<string>('GLOBAL_PREFIX') || 'api';
  app.setGlobalPrefix(prefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Products API')
    .setDescription(
      'API documentation for accessing product info, authentication, and reports.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`api/docs`, app, document);

  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);
}
bootstrap();
