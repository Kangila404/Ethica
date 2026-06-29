import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ==================== swagger config ==================== //
  const config = new DocumentBuilder()
  .setTitle('Ethica API')
  .setDescription('에티카 API 문서')
  .setVersion('1.0')
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

// ========================================================= //

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
