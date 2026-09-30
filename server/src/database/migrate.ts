import { AdminSupportAccount1790733600000 } from './migrations/1790733600000-AdminSupportAccount';
import 'reflect-metadata';
import { DailyCycles1790730000000 } from './migrations/1790730000000-DailyCycles';
import { DataSource } from 'typeorm';
import { OnboardingAnalysis1790726400000 } from './migrations/1790726400000-OnboardingAnalysis';

try {
  process.loadEnvFile('.env');
} catch (error: unknown) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
    throw new Error('Unable to load environment file');
}
const db = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: false,
  migrations: [
    OnboardingAnalysis1790726400000,
    DailyCycles1790730000000,
    AdminSupportAccount1790733600000,
  ],
  migrationsTransactionMode: 'none', // MySQL DDL commits implicitly.
});
async function migrate(): Promise<void> {
  try {
    await db.initialize();
    const applied = await db.runMigrations();
    console.log(`Applied ${applied.length} migration(s)`);
  } catch {
    console.error(
      'Migration failed. Check DB connectivity and the required develop baseline schema.',
    );
    process.exitCode = 1;
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
void migrate();
