import { conceptBatch } from './types';

export const aiConcepts = conceptBatch('ai', 'AI', [
  {
    title: 'AI가 먼저 읽는 지원서',
    body: '회사가 AI로 지원서를 먼저 심사하려 해요. 검증에서 전체 오류는 줄었지만 개인별 탈락 이유는 설명하기 어려워요. 무엇을 우선할까요?',
    answers: [
      [
        '전체 오류를 줄이는 심사를 도입한다',
        'mill',
        '더 많은 지원자가 정확한 판단을 받는 결과에 무게를 두었어요. 밀의 결과 중심 관점을 적용한 해석이에요. 평균 정확도가 높아도 개별 피해의 크기와 이의 제기는 따로 살펴야 해요.',
      ],
      [
        '이유를 설명할 수 있을 때 도입한다',
        'kant',
        '심사받는 사람을 설명을 요구할 수 있는 주체로 보았어요. 칸트의 인간 존중을 현대 심사에 적용한 해석이에요. 도입을 미루는 동안 기존 심사의 오류가 이어질 수 있다는 비용도 있어요.',
      ],
    ],
    imageBrief:
      'Modern hiring desk: two recruiters compare paper application folders with a laptop showing abstract ranking bars. No readable text or identifiable applicants; thoughtful neutral expressions.',
  },
  {
    title: 'AI와 함께 완성한 그림',
    body: '공모전이 AI 사용을 허용하고 활용 과정도 공개해요. 직접 그린 작품과 AI를 세밀하게 지휘한 작품 중 무엇에 더 높은 점수를 줄까요?',
    answers: [
      [
        '작품에 드러난 직접 숙련을 높이 본다',
        'aristotle',
        '결과물과 함께 만드는 사람의 활동과 숙련에 주목했어요. 아리스토텔레스의 능력 발휘라는 관점을 창작에 빌려온 해석이에요. 새로운 도구로 발휘한 판단력을 놓치지 않을지도 살펴보세요.',
      ],
      [
        '도구보다 작품이 준 경험을 높이 본다',
        'mill',
        '감상자에게 생기는 풍부한 경험을 중심에 두었어요. 즐거움의 질을 묻는 밀의 관점을 적용했어요. 제작 과정의 기여를 평가하는 기준은 별도로 필요할 수 있어요.',
      ],
    ],
    imageBrief:
      'Contemporary art jury table with a physical sketchbook and a pen-display tablet showing two different original abstract artworks; two jurors look at both with equal respect. No robot.',
  },
  {
    title: '내 기록으로 배우는 AI',
    body: '학습 앱이 사용 기록을 AI 개선에 쓰려 해요. 동의한 사람의 기록만 쓰면 서비스 개선은 느려질 수 있어요. 어떤 원칙을 택할까요?',
    answers: [
      [
        '개별 동의를 받고 기록을 사용한다',
        'kant',
        '사람이 자신의 정보 사용에 참여할 권한을 우선했어요. 타인을 단지 목적의 수단으로 삼지 않는 칸트의 관점과 연결해볼 수 있어요. 동의를 구하는 수고도 함께 감수하는 선택이에요.',
      ],
      [
        '되돌릴 수 없게 익명화해 활용한다',
        'mill',
        '개인에게 돌아갈 위험을 줄이면서 학습의 이익을 얻으려 했어요. 밀의 관점을 적용한 판단이에요. 실제로 재식별이 불가능한지와 법적 요건은 별도 검증이 필요하며, 이 선택이 허가를 대신하지는 않아요.',
      ],
    ],
    imageBrief:
      'Adult using a learning app on a phone, paused at an unlabelled privacy toggle beside an open notebook on a plain home desk. Focus on the hand deciding, no readable interface text.',
  },
  {
    title: 'AI 조언을 따를지 말지',
    body: 'AI가 내 기록을 분석해 안정적인 진로를 권했어요. 설명은 납득되지만 직접 해보고 싶은 일은 달라요. 어느 쪽에 무게를 둘까요?',
    answers: [
      [
        '예측보다 내 삶의 실험을 택한다',
        'mill',
        '자기 삶을 직접 시험할 자유를 중요하게 보았어요. 밀의 개성 논의와 연결돼요. AI 조언을 모두 버리기보다 감수할 위험을 파악한 채 선택하는 것인지 돌아볼 수 있어요.',
      ],
      [
        '조언을 검토해 내 판단에 반영한다',
        'epictetus',
        '추천의 결론보다 그것을 받아들이는 자신의 판단을 돌보려 했어요. 에픽테토스의 선택에 대한 강조와 연결돼요. 조언에 따르는 일과 판단을 전부 넘기는 일은 같지 않아요.',
      ],
    ],
    imageBrief:
      'Young adult comparing a career recommendation on a laptop with a hands-on design project and work notes on a contemporary desk. Screen has abstract charts only, no text.',
  },
  {
    title: '나를 위로하는 대화 상대',
    body: 'AI와 대화하면 마음이 편하지만 실제 사람이 아니라는 점도 알아요. 시간이 한정돼 있다면 어떤 관계에 더 시간을 쓰고 싶나요?',
    answers: [
      [
        '편안함을 주는 AI 대화를 이어간다',
        'epicurus',
        '당장의 외로움과 불안을 덜어 주는 경험을 살폈어요. 에피쿠로스의 평온을 현대 상황에 적용한 해석이에요. 이 대화가 장기적인 고립을 키우는지도 함께 점검할 수 있어요.',
      ],
      [
        '서로 돌보는 사람과의 만남을 늘린다',
        'aristotle',
        '위로를 받는 데서 나아가 서로의 삶에 참여하는 관계를 택했어요. 아리스토텔레스의 우정 논의와 연결돼요. 사람과 관계를 맺는 데 따르는 부담과 불확실성도 받아들이는 선택이에요.',
      ],
    ],
    imageBrief:
      'Modern apartment evening: an adult sits beside a phone with abstract chat bubbles, looking toward a second empty chair across a small table. Calm not miserable, no holograms or robot.',
  },
  {
    title: '평균에는 좋은 AI의 결정',
    body: '시가 AI로 공공시설 이용 신청을 배정하려 해요. 전체 대기 시간은 줄지만, 자료가 적은 야간 근무자의 신청은 더 자주 밀려요. 사람의 재심사는 가능하지만 예산을 더 써야 한다면 어떻게 도입할까요?',
    answers: [
      [
        '불리한 집단의 배정 격차부터 줄인다',
        'rawls',
        '효율의 이익뿐 아니라 누가 계속 불리해지는지 살폈어요. 공정한 협력 조건을 묻는 롤스의 관점을 응용했어요. 원인을 보완하는 동안 전체 대기 감소가 늦어질 수 있어요.',
      ],
      [
        'AI를 도입하고 재심사 예산을 확보한다',
        'mill',
        '전체 대기를 줄이면서 남는 피해를 따로 보완하려 했어요. 밀의 결과 평가를 적용한 판단이에요. 이의 신청 자체가 어려운 사람에게도 보완책이 도달하는지는 따져야 해요.',
      ],
    ],
    followup: {
      body: '추가 확인 결과, 배정이 밀린 사람들은 재심사 제도를 잘 모르고 있었어요. 한정된 보완 예산은 어디에 먼저 쓸까요?',
      answers: [
        [
          '신청하지 않아도 불이익을 찾아 재검토한다',
          '도움을 요청할 능력과 실제 필요가 다를 수 있다고 보았어요. 자동 재검토의 비용과 잘못된 개입 가능성도 함께 살펴보세요.',
        ],
        [
          '쉬운 안내와 신청 지원을 먼저 제공한다',
          '당사자가 자신의 사정을 설명하며 이의를 제기할 통로를 넓혔어요. 안내만으로 기존 격차를 충분히 줄일 수 있는지도 돌아볼 수 있어요.',
        ],
      ],
    },
    imageBrief:
      'Modern municipal service counter: a night-shift worker carrying a work bag discusses a booking with an official, computer shows a simple calendar of colored blocks, neutral atmosphere.',
  },
  {
    title: 'AI가 쓴 사과를 전한다면',
    body: '친구에게 사과하고 싶지만 말을 잘 정리하지 못해 AI의 도움을 받았어요. 내용은 내 마음과 같고 직접 고쳤어요. 친구는 진심을 중요하게 생각해요. 사과문을 전할 때 무엇을 함께 말할까요?',
    answers: [
      [
        'AI의 도움을 받은 과정도 먼저 밝힌다',
        'kant',
        '상대가 표현의 과정을 알고 판단할 여지를 존중했어요. 칸트의 인간 존중을 사과 상황에 적용한 해석이에요. 도구 설명이 사과의 내용보다 앞서 보일 수 있다는 부담도 있어요.',
      ],
      [
        '내가 책임질 내용과 실천을 먼저 전한다',
        'aristotle',
        '사과의 문장보다 이후 관계에서 드러낼 행동을 우선했어요. 성품과 실천을 중시하는 아리스토텔레스의 관점과 연결돼요. 상대가 과정을 물으면 숨기지 않는 것과도 양립할 수 있어요.',
      ],
    ],
    followup: {
      body: '친구가 앞으로 중요한 대화에는 AI를 쓰지 말아 달라고 부탁해요. 표현을 정리하는 데 계속 도움이 필요하다면요?',
      answers: [
        [
          '직접 쓴 짧은 말로 대화를 이어간다',
          '매끄러움보다 상대가 원하는 소통 방식을 존중했어요. 짧고 서툰 표현으로도 필요한 책임을 충분히 전할 수 있을지 생각해보세요.',
        ],
        [
          '허용할 도움의 범위를 함께 정한다',
          '상대의 요청과 자신의 어려움을 함께 대화의 대상으로 삼았어요. 합의가 없는데도 편의를 이유로 도움을 쓰는 것과는 구분돼요.',
        ],
      ],
    },
    imageBrief:
      'Contemporary cafe: one adult hesitates before passing a handwritten apology note to a friend across the table; a phone with indistinct draft bubbles lies nearby. No readable words, neither person villainized.',
  },
]);
