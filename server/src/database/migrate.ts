import { EditorialMedia1790920800000 } from './migrations/1790920800000-EditorialMedia';
import { ContentReview1790816400000 } from './migrations/1790816400000-ContentReview';
import { ProfileAvatar1790902800000 } from './migrations/1790902800000-ProfileAvatar';
import { AnalysisQuota1790812800000 } from './migrations/1790812800000-AnalysisQuota';
import { AdminSupportAccount1790733600000 } from './migrations/1790733600000-AdminSupportAccount';
import 'reflect-metadata';
import { DailyCycles1790730000000 } from './migrations/1790730000000-DailyCycles';
import { DataSource } from 'typeorm';
import { OnboardingAnalysis1790726400000 } from './migrations/1790726400000-OnboardingAnalysis';
import { OnboardingContent1790740800000 } from './migrations/1790740800000-OnboardingContent';

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
    OnboardingContent1790740800000,
    AnalysisQuota1790812800000,
    ContentReview1790816400000,
    ProfileAvatar1790902800000,
    EditorialMedia1790920800000,
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
