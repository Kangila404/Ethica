import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('api/health')
export class HealthController {
  constructor(private readonly database: DataSource) {}

  @Get()
  async check(): Promise<{ status: string }> {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
