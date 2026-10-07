import { justiceConcepts } from './justice';
import { freedomConcepts } from './freedom';
import { happinessConcepts } from './happiness';
import { selfConcepts } from './self';
import { desireConcepts } from './desire';
import { powerConcepts } from './power';
import { aiConcepts } from './ai';

// Approved 2026-10-04: seven categories, five onboarding + two daily each,
// publish after verification. Append only; preserve the original catalog/history.
export const conceptCategoriesV2 = [
  justiceConcepts,
  freedomConcepts,
  happinessConcepts,
  selfConcepts,
  desireConcepts,
  powerConcepts,
  aiConcepts,
] as const;
export const conceptQuestionsV2 = conceptCategoriesV2.flatMap((category) =>
  category.questions.map((question) => ({
    ...question,
    category: category.name,
  })),
);
export const conceptImagePromptV2 =
  'Use case: illustration-story. A single original editorial painting for a contemporary Korean philosophy question, landscape 3:2 full bleed. Modern people, clothes, objects and settings; restrained classical figurative composition, natural anatomy, layered oil paint, soft chiaroscuro and visible subtle brush texture, readable at phone size. Depict the specified action concretely and neutrally, never imply a correct moral answer. No text, lettering, logos, signatures, watermark, collage, historical costumes, temples, mythology, generic pondering philosopher, decorative plants, fantasy robots or holograms. Scene: ';
