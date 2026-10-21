import { onboardingV1 } from '../onboarding-v1';
import { dailyV1 } from '../editorial-v1';
import { conceptQuestionsV2 } from '../concepts-v2';
import { justice, freedom } from './justice-freedom';
import { happiness, self } from './happiness-self';
import { desire, power } from './desire-power';
import { ai } from './ai';
import { relationships } from './relationships';
import { community } from './community';
import { workLife } from './work-life';
export { thinkers, additionalThinkers } from './types';

// Exact editorial renames confirmed on NAS, 2026-10-21. Never match fuzzy text
// or numeric IDs; both original and renamed matches together must still fail.
const renamedTitles: Record<string, string> = {
  '도움을 주는 두 가지 방식': '이웃에 도움을 주는 방법',
  '온라인 모임에서 말하기 어렵다면': '모임에서 저도 말 좀하고 싶어요!',
  '좋은 사업을 알리는 방식': '자선행사를 알려 봐요!',
};

// A new edition, not edits to released payloads. Preserve the original question,
// answer, follow-up and user-composition rows. The old title identifies its slot;
// it is NOT a claim that the new question asks the same thing.
export const questionsV3 = [
  relationships,
  community,
  workLife,
  justice,
  freedom,
  happiness,
  self,
  desire,
  power,
  ai,
].flatMap((group) =>
  group.map((q, index) => {
    const legacy = onboardingV1.find((c) => c.name === q.category);
    const oldTitle = legacy
      ? index < 5
        ? legacy.questions[index].title
        : dailyV1.filter((old) => old.category === q.category)[index - 5].title
      : conceptQuestionsV2.filter((old) => old.category === q.category)[index]
          .title;
    return {
      ...q,
      replaces: {
        title: oldTitle,
        titles: [
          oldTitle,
          ...(renamedTitles[oldTitle] ? [renamedTitles[oldTitle]] : []),
        ],
        usage: q.usage,
      },
    };
  }),
);

export function validateQuestionsV3(): void {
  if (questionsV3.length !== 79)
    throw new Error('Expected 79 revised questions');
  const keys = new Set<string>();
  const titles = new Set<string>();
  const oldSlots = new Set<string>();
  for (const q of questionsV3) {
    const slot = `${q.usage}:${q.replaces.title}`;
    if (keys.has(q.key) || titles.has(q.title) || oldSlots.has(slot))
      throw new Error(`Duplicate question slot: ${q.key}`);
    keys.add(q.key);
    titles.add(q.title);
    oldSlots.add(slot);
    if (
      q.answers.length !== 2 ||
      q.answers[0].philosopher === q.answers[1].philosopher
    )
      throw new Error(`Invalid choices: ${q.key}`);
    if (q.usage === 'daily' && (!q.followup || q.followup.answers.length !== 2))
      throw new Error(`Missing daily follow-up: ${q.key}`);
    if (q.usage === 'onboarding' && q.followup)
      throw new Error(`Keep introductory questions single-stage: ${q.key}`);
    if (
      !q.source.startsWith('https://') ||
      !q.reference ||
      !q.body.includes('\n\n')
    )
      throw new Error(`Missing editorial metadata: ${q.key}`);
  }
}
