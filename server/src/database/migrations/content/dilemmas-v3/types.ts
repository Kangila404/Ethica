import { thinkerProfilesV1, thinkerPortrait } from '../thinker-profiles-v1';
import portraits from '../thinker-portraits-v1.json';

export type Choice = readonly [
  text: string,
  thinker: string,
  explanation: string,
];
export type Followup = {
  lines: readonly string[];
  choices: readonly [readonly [string, string], readonly [string, string]];
};
export type Seed = {
  title: string;
  lines: readonly string[];
  choices: readonly [Choice, Choice];
  source: string;
  reference: string;
  image: string;
  followup?: Followup;
};

// Explicit paragraphs: no punctuation heuristic, no splitting names or quotations.
export const paragraphs = (lines: readonly string[]) => lines.join('\n\n');

export const additionalThinkers = [
  [
    'nozick',
    '로버트 노직',
    '1938–2002',
    '정치철학·권리론',
    '좋은 결과를 위해서라도 개인에게 해서는 안 되는 일이 있는지 물었습니다. 경험 기계 사고실험에서는 즐거운 느낌만으로 좋은 삶을 설명할 수 있는지 따졌습니다.',
    '미국의 철학자입니다. 《무정부, 국가, 유토피아》에서 최소국가와 권리를 논했으며, 경험 기계는 같은 책에서 제시한 사고실험입니다.',
    'https://plato.stanford.edu/entries/nozick-political/',
  ],
  [
    'thomson',
    '주디스 자비스 톰슨',
    '1929–2020',
    '윤리학·권리론',
    '생명을 존중해야 한다는 말만으로 타인의 몸과 자원을 사용할 권리까지 생기는지 물었습니다. 구체적인 사례를 바꾸며 권리와 해악의 경계를 분석했습니다.',
    '미국의 철학자로 MIT에서 가르쳤습니다. 「낙태 옹호」의 바이올리니스트 사고실험과 트롤리 문제에 대한 연구로 알려져 있습니다. 트롤리 문제에 관한 입장에는 시기별 변화가 있습니다.',
    'https://plato.stanford.edu/entries/doing-allowing/',
  ],
  [
    'singer',
    '피터 싱어',
    '1946년생',
    '실천윤리·공리주의',
    '누구의 고통인지보다 얼마나 심각한 고통인지가 중요한 것은 아닐까요. 동물의 이익과 멀리 있는 타인을 도울 의무를 일상의 선택에 연결했습니다.',
    '호주 출신 철학자입니다. 「기근, 풍요, 도덕」과 《동물 해방》에서 원조와 동물 대우에 관한 윤리적 논쟁을 제기했습니다.',
    'https://faculty.uca.edu/rnovy/Singer--FamineAffluence%26Morality.htm',
  ],
  [
    'parfit',
    '데릭 파핏',
    '1942–2017',
    '인격 동일성·윤리학',
    '미래의 사람이 지금의 나와 엄밀히 같은 사람인지보다 기억과 계획이 어떻게 이어지는지가 중요할 수 있습니다. 미래 세대에 대한 책임도 새롭게 물었습니다.',
    '영국의 철학자입니다. 《이유와 인격》에서 심리적 연속성, 분기, 비동일성 문제와 인구윤리를 탐구했습니다.',
    'https://plato.stanford.edu/entries/identity-ethics/',
  ],
  [
    'frankfurt',
    '해리 프랑크푸르트',
    '1929–2023',
    '자유의지·인격',
    '원하는 일을 하는 것과 그 욕망을 자신의 것으로 받아들이는 것은 다릅니다. 자신의 욕망에 대한 태도와 다른 선택의 가능성이 책임에 어떤 역할을 하는지 물었습니다.',
    '미국의 철학자입니다. 「대안 가능성과 도덕적 책임」, 「의지의 자유와 인격 개념」에서 자유의지와 책임을 논했습니다.',
    'https://plato.stanford.edu/entries/compatibilism/',
  ],
  [
    'hobbes',
    '토머스 홉스',
    '1588–1679',
    '사회계약론',
    '서로를 믿을 수 없다면 평화를 원하는 사람도 방어를 위해 공격할 수 있습니다. 약속을 지킬 공통 권력이 왜 필요한지 탐구했습니다.',
    '영국의 철학자입니다. 《리바이어던》에서 자연상태, 계약, 주권을 설명했습니다. 강한 주권을 주장했지만 자기 생명을 지킬 자유까지 모두 양도된다고 보지는 않았습니다.',
    'https://www.gutenberg.org/ebooks/3207',
  ],
  [
    'locke',
    '존 로크',
    '1632–1704',
    '경험론·자연권',
    '정부의 권력은 무엇으로 정당화될까요. 생명·자유·소유와 동의를 논했으며, 인격의 동일성을 의식과 기억의 연결로 설명하려 했습니다.',
    '영국의 철학자입니다. 《통치론》과 《인간지성론》에서 정치적 권리와 지식, 인격의 문제를 다뤘습니다.',
    'https://www.gutenberg.org/ebooks/7370',
  ],
  [
    'sen',
    '아마르티아 센',
    '1933년생',
    '역량 접근·사회선택',
    '같은 자원을 받아도 실제로 할 수 있는 일은 다를 수 있습니다. 소득이나 만족도뿐 아니라 사람이 어떤 삶을 선택할 수 있는지로 자유와 정의를 살폈습니다.',
    '인도 출신 경제학자이자 사상가입니다. 《자유로서의 발전》과 《정의의 아이디어》에서 역량과 공적 추론을 논했습니다.',
    'https://plato.stanford.edu/entries/capability-approach/',
  ],
  [
    'nagel',
    '토머스 네이글',
    '1937년생',
    '마음철학·윤리학',
    '밖에서 관찰한 정보만으로 다른 존재의 경험을 알 수 있을까요. 주관적 경험과 객관적 설명의 간격, 통제할 수 없는 운이 도덕적 평가에 끼어드는 문제를 탐구했습니다.',
    '미국의 철학자입니다. 「박쥐가 된다는 것은 어떤 것인가」와 「도덕적 운」, 《어디에도 없는 곳에서의 관점》 등을 썼습니다.',
    'https://plato.stanford.edu/entries/moral-luck/',
  ],
  [
    'turing',
    '앨런 튜링',
    '1912–1954',
    '계산이론·기계 지능',
    '기계가 생각하는지 묻기 전에 무엇을 지능의 증거로 인정할지 정해야 합니다. 대화 속에서 사람과 기계를 구별하는 모방 게임으로 질문을 바꾸었습니다.',
    '영국의 수학자이자 컴퓨터과학의 선구자입니다. 1950년 「계산 기계와 지능」에서 기계의 사고 가능성과 여러 반론을 검토했습니다.',
    'https://academic.oup.com/mind/article/LIX/236/433/986238',
  ],
  [
    'searle',
    '존 설',
    '20–21세기',
    '언어철학·마음철학',
    '규칙에 맞게 기호를 처리하는 것만으로 의미를 이해한다고 할 수 있을까요. 중국어 방 사고실험으로 프로그램 실행과 이해의 차이를 물었습니다.',
    '미국의 철학자입니다. 1980년 「마음, 뇌, 프로그램」에서 중국어 방 논증을 제시했습니다. 이 논증이 모든 기계의 사고 가능성을 부정하는 것은 아닙니다.',
    'https://plato.stanford.edu/entries/chinese-room/',
  ],
  [
    'foot',
    '필리파 풋',
    '1920–2010',
    '덕 윤리·해악의 윤리',
    '좋은 결과를 낳는다는 이유만으로 어떤 수단도 허용될까요. 해를 가하는 일과 도움을 주지 않는 일을 구별하고 인간의 덕과 좋은 삶을 탐구했습니다.',
    '영국의 철학자입니다. 1967년 이중효과 논의에서 폭주하는 전차 사례를 제시했습니다. 이후 《자연적 좋음》에서 덕 윤리를 발전시켰습니다.',
    'https://plato.stanford.edu/entries/philippa-foot/',
  ],
] as const;

export const thinkers = [
  ...thinkerProfilesV1.map((p) => ({
    ...p,
    imageKey: thinkerPortrait(p.key).imageKey,
    added: false,
  })),
  ...additionalThinkers.map(
    ([key, name, era, school, coreThought, lifeRoots, source]) => ({
      key,
      name,
      era,
      school,
      coreThought,
      lifeRoots,
      source,
      imageKey: null,
      added: true,
    }),
  ),
];

// Reuse existing, attributed assets. Portraits illustrate a related thinker,
// not a factual depiction of the imaginary event or its inventor.
export const portrait = (key: string): string => thinkerPortrait(key).imageKey;
export const illustration = (key: string): string => `concept-v2-${key}.jpg`;

function attribution(q: Seed): string {
  const p = portraits.find((p) => p.imageKey === q.image);
  const imageCredit = p
    ? `${p.creator}\n${p.license}\n${p.sourceUrl}\n${p.licenseUrl}\n${p.changes}\n해설의 관련 사상가를 보여주는 자료 이미지이며, 가상의 사건을 재현한 그림은 아니에요.`
    : 'Ethica 제작 AI 생성 삽화. 기존 concept-v2 자산을 변경 없이 재사용했어요. 질문의 쟁점을 설명하는 삽화이며 실제 사건의 기록이 아니에요.';
  // Existing iOS CitedText renders these headings as the compact source sheet.
  return `\n\n[자료 출처]\n${q.reference}\n${q.source}\n선택지 연결은 관점을 이해하기 위한 편집적 해석이며 철학자의 직접 답변이나 성향 진단이 아니에요.\n\n[이미지 출처]\n${imageCredit}`;
}

export function batch(category: string, seeds: readonly Seed[]) {
  return seeds.map((q, i) => ({
    ...q,
    key: `${category}-${i + 1}`,
    category,
    usage: i < 5 ? ('onboarding' as const) : ('daily' as const),
    type: q.followup ? ('twoStage' as const) : ('single' as const),
    body: paragraphs(q.lines),
    imageKey: q.image,
    answers: q.choices.map(([body, philosopher, explanation]) => ({
      body,
      philosopher,
      explanation: explanation + attribution(q),
    })),
    followup: q.followup
      ? {
          body: paragraphs(q.followup.lines),
          answers: q.followup.choices.map(([body, explanation]) => ({
            body,
            explanation,
          })),
        }
      : undefined,
  }));
}
