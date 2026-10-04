// Original scenarios; thinker mappings are modern editorial applications, not quotations.
export const conceptThinkers = {
  kant: {
    name: '이마누엘 칸트',
    source: 'https://www.gutenberg.org/cache/epub/5682/pg5682-images.html',
    section: '도덕형이상학 정초 제2절: 보편화·인간성 정식',
  },
  mill: {
    name: '존 스튜어트 밀',
    source: 'https://www.gutenberg.org/cache/epub/34901/pg34901-images.html',
    section: '자유론 제2~4장: 토론·개성·타인에 대한 해악',
    additionalSource:
      'https://www.gutenberg.org/cache/epub/11224/pg11224-images.html',
  },
  aristotle: {
    name: '아리스토텔레스',
    source: 'https://classics.mit.edu/Aristotle/nicomachaen.html',
    section: '니코마코스 윤리학 제1·2·6·8권: 활동·습관·실천적 지혜·우정',
  },
  rawls: {
    name: '존 롤스',
    source:
      'https://www.keithhankins.com/uploads/2/1/7/9/21794922/rawls_-_justice_as_fairness_1959.pdf',
    section:
      'Justice as Fairness (1958): 공정한 협력 조건·자유·불평등의 정당화',
  },
  epictetus: {
    name: '에픽테토스',
    source: 'https://classics.mit.edu/Epictetus/epicench.html',
    section: '엥케이리디온 1·5·6·19·34절: 판단·외부 평가·욕구',
  },
  epicurus: {
    name: '에피쿠로스',
    source: 'https://classics.mit.edu/Epicurus/menoec.html',
    section: '메노이케우스에게 보내는 편지: 욕망의 구별·즐거움과 고통의 숙고',
  },
  hume: {
    name: '데이비드 흄',
    source: 'https://davidhume.org/texts/t/1/4/6',
    section: '인성론 1.4.6: 지각의 변화·기억·인격의 동일성',
  },
} as const;
export type ConceptThinker = keyof typeof conceptThinkers;
type Choice = readonly [
  body: string,
  philosopher: ConceptThinker,
  explanation: string,
];
type FollowupChoice = readonly [body: string, explanation: string];
export type ConceptSeed = {
  title: string;
  body: string;
  answers: readonly [Choice, Choice];
  imageBrief: string;
  followup?: {
    body: string;
    answers: readonly [FollowupChoice, FollowupChoice];
  };
};
export function conceptBatch(
  key: string,
  name: string,
  seeds: readonly ConceptSeed[],
) {
  return {
    key,
    name,
    questions: seeds.map((seed, index) => ({
      ...seed,
      key: `${key}-${String(index + 1).padStart(2, '0')}`,
      usage: seed.followup ? ('daily' as const) : ('onboarding' as const),
      type: seed.followup ? ('twoStage' as const) : ('single' as const),
      imageKey: `concept-v2-${key}-${String(index + 1).padStart(2, '0')}.jpg`,
      answers: seed.answers.map(([body, philosopher, explanation]) => ({
        body,
        philosopher,
        explanation,
      })),
      followup: seed.followup
        ? {
            body: seed.followup.body,
            answers: seed.followup.answers.map(([body, explanation]) => ({
              body,
              explanation,
            })),
          }
        : undefined,
    })),
  };
}
