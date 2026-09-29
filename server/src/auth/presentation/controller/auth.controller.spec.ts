import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from '../../application/auth.service';

// HTTP contract tests use a service double; provider verification has RSA tests.
describe('social auth HTTP contract', () => {
  let app: INestApplication;
  const service = {
    createChallenge: jest.fn(() => ({
      challengeId: '65e81ffd-5734-4ccd-beb0-d3de59d926b6',
      nonce: 'nonce',
      expiresAt: new Date().toISOString(),
    })),
    socialLogin: jest.fn(() => ({
      accessToken: 'app-access',
      refreshToken: 'app-refresh',
      user: {
        userId: 'uuid',
        name: '나',
        role: 'user',
        onboardingStatus: 'incomplete',
      },
    })),
    refreshToken: jest.fn(() => ({ accessToken: 'rotated' })),
    logout: jest.fn(() => ({ message: 'success' })),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it.each(['google', 'apple', 'kakao'])(
    'accepts common %s requests',
    async (provider) => {
      await request(app.getHttpServer() as Server)
        .post('/api/auth/social/challenge')
        .send({ provider })
        .expect(201);
      const response = await request(app.getHttpServer() as Server)
        .post('/api/auth/login/social')
        .send({
          provider,
          challengeId: '65e81ffd-5734-4ccd-beb0-d3de59d926b6',
          idToken: 'id-token',
        })
        .expect(201);
      expect(response.body).toMatchObject({
        accessToken: 'app-access',
        user: { role: 'user' },
      });
    },
  );
  it('rejects unsupported providers, missing values, and role injection', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/auth/social/challenge')
      .send({ provider: 'local' })
      .expect(400);
    await request(app.getHttpServer() as Server)
      .post('/api/auth/login/social')
      .send({ provider: 'google' })
      .expect(400);
    await request(app.getHttpServer() as Server)
      .post('/api/auth/login/social')
      .send({
        provider: 'google',
        challengeId: '65e81ffd-5734-4ccd-beb0-d3de59d926b6',
        idToken: 'x',
        role: 'admin',
      })
      .expect(400);
  });
  it('removes local signup/login routes', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/auth/login/email')
      .send({})
      .expect(404);
    await request(app.getHttpServer() as Server)
      .post('/api/auth/signup/email')
      .send({})
      .expect(404);
  });
  it('retains validated refresh and logout requests', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/auth/token/refresh')
      .send({ refreshToken: 'token' })
      .expect(201);
    await request(app.getHttpServer() as Server)
      .post('/api/auth/logout')
      .send({ refreshToken: 'token' })
      .expect(201);
    await request(app.getHttpServer() as Server)
      .post('/api/auth/token/refresh')
      .send({})
      .expect(400);
    await request(app.getHttpServer() as Server)
      .post('/api/auth/logout')
      .send({ refreshToken: 123 })
      .expect(400);
  });
});
