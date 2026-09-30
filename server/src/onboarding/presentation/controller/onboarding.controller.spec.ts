import type { Server } from 'node:http';
import {
  INestApplication,
  ExecutionContext,
  ConflictException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import request from 'supertest';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from '../../application/onboarding.service';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { ApiExceptionFilter } from 'src/common/filter/api-exception.filter';

describe('Onboarding HTTP validation and error contract', () => {
  let app: INestApplication;
  const service = {
    selectCategory: jest.fn().mockResolvedValue({ interestCategoryId: '1' }),
    registerDailyTime: jest.fn().mockResolvedValue({}),
    getResult: jest.fn(),
    saveDraft: jest.fn().mockResolvedValue({ nextStage: 2 }),
    submitAnswer: jest.fn().mockResolvedValue({}),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [
        { provide: OnboardingService, useValue: service },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<{ user: { userId: string } }>().user = {
            userId: 'authenticated-user',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it.each([
    {},
    { categoryId: 1 },
    { categoryId: 'not-an-id' },
    { categoryId: '1', userId: 'other' },
  ])('rejects invalid category input', async (body) => {
    const res = await request(app.getHttpServer() as Server)
      .post('/api/onboarding/question')
      .send(body)
      .expect(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('passes the authenticated user rather than a body ID', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/onboarding/question')
      .send({ categoryId: '1' })
      .expect(201);
    expect(service.selectCategory).toHaveBeenCalledWith('authenticated-user', {
      categoryId: '1',
    });
  });
  it.each([
    { timezone: 'Mars/Olympus' },
    { dailyQuestionTime: '25:30', timezone: 'UTC' },
    {},
  ])('rejects invalid timezone and time', async (body) => {
    await request(app.getHttpServer() as Server)
      .post('/api/onboarding/daily-time')
      .send(body)
      .expect(400);
  });
  it('allows omitted time with an explicit device timezone', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/onboarding/daily-time')
      .send({ timezone: 'Asia/Seoul' })
      .expect(201);
  });
  it('preserves domain error codes', async () => {
    service.getResult.mockRejectedValueOnce(
      new ConflictException({
        code: 'ONBOARDING_INCOMPLETE',
        message: '5문제에 답해주세요.',
      }),
    );
    await request(app.getHttpServer() as Server)
      .post('/api/onboarding/result')
      .expect(409)
      .expect({
        code: 'ONBOARDING_INCOMPLETE',
        message: '5문제에 답해주세요.',
      });
  });
  it('does not leak internal errors', async () => {
    service.getResult.mockRejectedValueOnce(
      new Error('private SQL and credential details'),
    );
    const res = await request(app.getHttpServer() as Server)
      .post('/api/onboarding/result')
      .expect(500);
    expect(res.body).toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(JSON.stringify(res.body)).not.toContain('private SQL');
  });
  it('accepts draft selection and rejects additional fields', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/onboarding/answers/draft')
      .send({ questionId: '1', answerId: '11' })
      .expect(201);
    await request(app.getHttpServer() as Server)
      .post('/api/onboarding/answers/draft')
      .send({ questionId: '1', answerId: '11', followupAnswerId: '111' })
      .expect(400);
  });
});
