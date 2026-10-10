import { IllustrateLearningSlides1791007200000 } from './migrations/1791007200000-IllustrateLearningSlides';
import { ExpandLearningLibrary1791025200000 } from './migrations/1791025200000-ExpandLearningLibrary';
import { PublishPhilosopherStories1791028800000 } from './migrations/1791028800000-PublishPhilosopherStories';
import { ConceptQuestions1791079200000 } from './migrations/1791079200000-ConceptQuestions';
import { PublishCamusWorks1791097200000 } from './migrations/1791097200000-PublishCamusWorks';
import { PublishAnalects1791158400000 } from './migrations/1791158400000-PublishAnalects';
import { PublishCollectedWorks1791172800000 } from './migrations/1791172800000-PublishCollectedWorks';
import { MultiDevicePush1791266400000 } from './migrations/1791266400000-MultiDevicePush';
import { LearningAccessAndLikes1791331200000 } from './migrations/1791331200000-LearningAccessAndLikes';
import { PublishNorseMythology1791417600000 } from './migrations/1791417600000-PublishNorseMythology';
import { PublishGreekMythology1791504000000 } from './migrations/1791504000000-PublishGreekMythology';
import { PublishPendingMythologies1791590400000 } from './migrations/1791590400000-PublishPendingMythologies';
import { PublishLegalDocuments1791597600000 } from './migrations/1791597600000-PublishLegalDocuments';
import { ReplaceLearningPosts1791003600000 } from './migrations/1791003600000-ReplaceLearningPosts';
import { ThinkerProfiles1791000000000 } from './migrations/1791000000000-ThinkerProfiles';
import { PublishReviewedContent1790989200000 } from './migrations/1790989200000-PublishReviewedContent';
import { AiConsent1790985600000 } from './migrations/1790985600000-AiConsent';
import { Baseline1790720000000 } from './migrations/1790720000000-Baseline';
import { EditorialMedia1790920800000 } from './migrations/1790920800000-EditorialMedia';
import { ContentReview1790816400000 } from './migrations/1790816400000-ContentReview';
import { ProfileAvatar1790902800000 } from './migrations/1790902800000-ProfileAvatar';
import { AnalysisQuota1790812800000 } from './migrations/1790812800000-AnalysisQuota';
import { AdminSupportAccount1790733600000 } from './migrations/1790733600000-AdminSupportAccount';
import 'reflect-metadata';
import { UniqueLearningSlideImages1791010800000 } from './migrations/1791010800000-UniqueLearningSlideImages';
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
    Baseline1790720000000,
    OnboardingAnalysis1790726400000,
    DailyCycles1790730000000,
    AdminSupportAccount1790733600000,
    OnboardingContent1790740800000,
    AnalysisQuota1790812800000,
    ContentReview1790816400000,
    ProfileAvatar1790902800000,
    EditorialMedia1790920800000,
    AiConsent1790985600000,
    PublishReviewedContent1790989200000,
    ThinkerProfiles1791000000000,
    ReplaceLearningPosts1791003600000,
    IllustrateLearningSlides1791007200000,
    UniqueLearningSlideImages1791010800000,
    ExpandLearningLibrary1791025200000,
    PublishPhilosopherStories1791028800000,
    ConceptQuestions1791079200000,
    PublishCamusWorks1791097200000,
    PublishAnalects1791158400000,
    PublishCollectedWorks1791172800000,
    MultiDevicePush1791266400000,
    LearningAccessAndLikes1791331200000,
    PublishNorseMythology1791417600000,
    PublishGreekMythology1791504000000,
    PublishPendingMythologies1791590400000,
    PublishLegalDocuments1791597600000,
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
      'Migration failed. Check DB connectivity, baseline integrity and bundled content files.',
    );
    process.exitCode = 1;
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
void migrate();
