import { conceptBatch } from './types';

export const justiceConcepts = conceptBatch('justice', '정의', [
  {
    title: '늦게 낸 신청서를 받을까',
    body: '공공 강좌의 마감이 지났어요. 한 신청자는 안내를 읽기 어려워 접수가 늦었다고 해요. 아직 빈자리가 있다면 어떻게 할까요?',
    answers: [
      [
        '같은 사정에 적용할 예외를 마련한다',
        'rawls',
        '형식상 같은 기회가 실제로도 같은지 물었어요. 공정한 조건을 살피는 롤스의 관점을 응용한 선택이에요. 예외의 기준도 다른 신청자에게 설명할 수 있어야 해요.',
      ],
      [
        '공고한 기한을 지키고 다음에 돕는다',
        'kant',
        '기한을 믿고 행동한 사람에게도 일관되게 설명할 규칙을 택했어요. 칸트의 보편화 관점을 빌린 해석이에요. 기존 규칙 자체에 배제의 문제가 없는지는 별도로 물어야 해요.',
      ],
    ],
    imageBrief:
      'Contemporary public class registration counter with an adult holding an application form and a clerk checking a wall clock; empty classroom seats visible behind, no readable text.',
  },
  {
    title: '고장 난 승강기의 수리비',
    body: '주민 공동시설의 승강기를 고쳐야 해요. 모두 같은 이용 권한이 있지만 어떤 주민에게는 유일한 출입 수단이에요. 분담은 어떻게 정할까요?',
    answers: [
      [
        '공동의 접근권을 위해 함께 부담한다',
        'rawls',
        '실제로 시설을 이용할 수 있는 조건을 함께 지키려 했어요. 롤스의 공정한 협력이라는 문제의식을 적용했어요. 이용 빈도가 낮은 사람에게도 공동 부담의 이유를 설명할 필요가 있어요.',
      ],
      [
        '형편과 이용을 듣고 부담을 조정한다',
        'aristotle',
        '하나의 수치보다 구체적인 사정을 살피려 했어요. 아리스토텔레스의 실천적 지혜를 적용한 판단이에요. 사정을 고려하는 과정이 자의적인 특혜가 되지 않도록 해야 해요.',
      ],
    ],
    imageBrief:
      'Residents in modern casual clothes discussing repairs in front of a closed community-building elevator; one resident uses a wheelchair; repair technician holds a clipboard, dignified neutral depiction.',
  },
  {
    title: '배상과 용서의 순서',
    body: '대여 물품을 실수로 망가뜨린 사람이 사과했지만 배상할 돈이 부족해요. 운영자는 물품도 다시 마련해야 해요. 무엇을 먼저 제안할까요?',
    answers: [
      [
        '책임은 같게 두고 납부를 나눈다',
        'kant',
        '사정이 달라도 맡은 책임을 설명할 공통 기준을 지키려 했어요. 칸트의 원칙 중심 관점을 적용했어요. 상환 방식이 상대의 생활을 무너뜨리지 않는지도 함께 살펴야 해요.',
      ],
      [
        '회복 효과를 따져 봉사로 바꾼다',
        'mill',
        '현실적으로 얻을 수 있는 회복과 부담을 비교했어요. 밀의 결과 평가와 연결돼요. 봉사가 실제 피해 회복에 도움이 되는지, 다른 이용자에게도 납득되는지 확인할 필요가 있어요.',
      ],
    ],
    imageBrief:
      'A modern community tool library desk with one broken borrowed power drill; borrower and volunteer discuss a plain form and replacement parts, no money piles or accusing gestures.',
  },
  {
    title: '같은 점수의 두 지원자',
    body: '연수 지원자 두 명의 점수가 같아요. 한 명은 교육 기회가 적었고 다른 한 명은 배운 내용을 더 많은 동료와 나눌 수 있어요. 누구를 우선할까요?',
    answers: [
      [
        '배울 기회가 적었던 사람',
        'rawls',
        '이미 쌓인 기회의 차이가 계속 이어지는지 주목했어요. 롤스의 공정성 관점을 작은 조직에 적용했어요. 과거 기회의 부족을 어떻게 확인할지도 기준이 필요해요.',
      ],
      [
        '배움을 널리 나눌 수 있는 사람',
        'mill',
        '한 번의 지원이 여러 사람에게 줄 이익을 살폈어요. 밀의 관점을 적용한 해석이에요. 나눔의 약속이 실제로 이루어지는지, 기회가 특정인에게 쏠리지 않는지도 물을 수 있어요.',
      ],
    ],
    imageBrief:
      'Two colleagues sit equally across a training selection desk, with matching plain folders and a small stack of workshop materials between them. Contemporary office, no visible scores or text.',
  },
  {
    title: '추첨이 언제나 공정할까',
    body: '공용 연습실의 인기 시간을 추첨하려 해요. 다른 시간에도 올 수 있는 사람과 그 시간만 가능한 사람이 함께 신청했어요. 어떤 방식을 고를까요?',
    answers: [
      [
        '모두에게 같은 추첨 기회를 준다',
        'kant',
        '특정 신청자만을 위한 기준보다 일관되게 적용할 절차를 골랐어요. 칸트의 보편화 관점을 응용한 해석이에요. 같은 절차가 다른 처지를 충분히 고려하는지는 남는 질문이에요.',
      ],
      [
        '대체 시간이 없는 사정을 반영한다',
        'rawls',
        '같은 당첨 확률보다 실제 참여 가능성에 주목했어요. 공정한 협력 조건이라는 롤스의 관점과 연결돼요. 사정을 입증하기 어려운 사람도 불리해지지 않아야 해요.',
      ],
    ],
    imageBrief:
      'Present-day shared music practice room booking desk, small bowl of folded lottery slips beside a blank weekly schedule, two musicians with instrument cases discussing access.',
  },
  {
    title: '모두의 도로와 한 사람의 집',
    body: '동네의 위험한 길을 넓히면 많은 주민이 안전해져요. 하지만 한 가구가 오래 살던 집을 떠나야 하고, 보상만으로 잃는 것을 모두 채우기는 어려워요. 우회안은 더 비싸다면 무엇을 우선할까요?',
    answers: [
      [
        '이주 부담을 줄이며 안전 개선을 추진한다',
        'mill',
        '위험 감소와 이주 피해를 함께 비교하려 했어요. 밀의 결과 중심 관점을 적용했어요. 많은 사람의 작은 이익을 이유로 한 사람의 큰 손실을 가볍게 계산하지 않는 것이 중요해요.',
      ],
      [
        '당사자의 동의를 얻을 우회안을 찾는다',
        'kant',
        '한 가구가 타인의 목적을 위한 비용으로만 취급되지 않도록 했어요. 칸트의 인간 존중과 연결해볼 수 있어요. 우회에 필요한 재원과 안전 개선 지연도 책임 있게 설명해야 해요.',
      ],
    ],
    followup: {
      body: '우회안을 택하면 다른 필수 시설의 개선이 늦어진다는 사실을 알게 됐어요. 협의에서 무엇을 먼저 확인할까요?',
      answers: [
        [
          '각 대안에서 생길 피해를 함께 공개한다',
          '보이지 않던 비용까지 같은 테이블에 올렸어요. 서로 다른 손실을 비교할 때 숫자로 드러나지 않는 경험도 놓치지 않는지 살펴보세요.',
        ],
        [
          '누구에게도 넘지 않을 피해 한도를 정한다',
          '총량을 비교하기 전에 지킬 경계를 세웠어요. 모두에게 적용할 수 있는 한도인지, 한도 안의 손실도 정당화가 필요한지 생각해볼 수 있어요.',
        ],
      ],
    },
    imageBrief:
      'Modern neighborhood planning table with a street map and model of a small ordinary house; resident and road engineer discuss two route lines; no demolition, no readable labels.',
  },
  {
    title: '과거의 잘못을 바로잡는 채용',
    body: '한 조직이 과거에 특정 집단의 지원 기회를 제한했던 관행을 고쳤어요. 지금의 지원자들은 그 관행을 만든 사람이 아니에요. 앞으로의 채용에 어떤 보완을 먼저 넣을까요?',
    answers: [
      [
        '누적된 불리함을 줄이는 기회를 마련한다',
        'rawls',
        '형식적 개방 이후에도 남아 있는 출발 조건을 살폈어요. 롤스의 공정성 문제의식을 적용했어요. 보완이 실제 불리한 사람에게 닿도록 대상을 신중히 정해야 해요.',
      ],
      [
        '개인별 심사와 공개된 공통 기준을 강화한다',
        'kant',
        '현재의 각 지원자를 집단의 대리인보다 독립된 사람으로 보았어요. 칸트의 인간 존중을 응용했어요. 공통 기준에 과거의 장벽이 남아 있지 않은지도 검토해야 해요.',
      ],
    ],
    followup: {
      body: '공통 기준 중 한 자격증의 준비 비용이 높아 일부 지원자가 포기하고 있었어요. 다음 채용에서는 어떻게 할까요?',
      answers: [
        [
          '자격증 대신 같은 능력을 평가할 길을 연다',
          '평가하려는 능력과 그것을 증명하는 수단을 구분했어요. 대체 평가의 신뢰성을 어떻게 확보할지도 중요한 과제예요.',
        ],
        [
          '준비 비용을 지원하고 자격 기준을 유지한다',
          '기준을 바꾸기보다 그 기준에 접근할 조건을 넓혔어요. 비용 외에 시간과 정보의 장벽도 줄어드는지 살펴볼 수 있어요.',
        ],
      ],
    },
    imageBrief:
      'Contemporary employment information session, diverse adults reviewing qualification brochures at a plain table, an open laptop and certification workbook in foreground, no readable words.',
  },
]);
