import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('Deployment readiness', () => {
  it('reports ready only when a database query succeeds', async () => {
    const query = jest.fn().mockResolvedValue([{ result: 1 }]);
    const controller = new HealthController({ query } as unknown as DataSource);
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    query.mockRejectedValue(new Error('connection lost'));
    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
