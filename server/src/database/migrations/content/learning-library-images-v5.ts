import portraits from './thinker-portraits-v1.json';
import works from './learning-images-v2.json';
import prior from './learning-images-v3.json';
import unique from './learning-images-v4.json';
import additions from './learning-images-v5.json';
import { LibraryArticle } from './learning-library-v5';
import { SlideImage } from './learning-slides-v3';

// Six images per article: cover, four prose cards, credits. Assets may be
// shared BETWEEN articles, never within one article or via alternate crops.
const sets: Record<string, readonly string[]> = {
  socrates: [
    'p:socrates',
    'n:agora',
    'p:plato',
    'n:death-socrates',
    'u:hoplites',
    'n:athens-map',
  ],
  plato: [
    'p:plato',
    'n:death-socrates',
    'n:school-athens',
    'u:academy',
    'p:socrates',
    'n:athens-map',
  ],
  aristotle: [
    'p:aristotle',
    'u:lyceum',
    'u:academy',
    'u:lesbos',
    'u:hoplites',
    'n:agora',
  ],
  epicurus: [
    'p:epicurus',
    'n:agora',
    'n:pompeii-garden',
    'n:democritus',
    'n:lucretius',
    'n:rerum',
  ],
  epictetus: [
    'p:epictetus',
    'u:enchiridion',
    'u:zeno',
    'u:stoa',
    'u:arrian-front',
    'a:nicopolis',
  ],
  'marcus-aurelius': [
    'p:marcus-aurelius',
    'u:marcus',
    'n:column-marcus',
    'n:forum',
    'p:epictetus',
    'u:stoa',
  ],
  augustine: [
    'p:augustine',
    'n:carthage',
    'n:milan',
    'n:hippo',
    'n:confessions',
    'n:augustine-study',
  ],
  aquinas: [
    'p:aquinas',
    'n:naples',
    'n:albert',
    'n:summa',
    'n:notre-dame',
    'p:aristotle',
  ],
  descartes: [
    'p:descartes',
    'n:leiden',
    'n:discourse',
    'n:meditations-descartes',
    'n:christina',
    'u:newton',
  ],
  spinoza: [
    'p:spinoza',
    'n:amsterdam-view',
    'n:rijnsburg',
    'n:tractatus-spinoza',
    'n:ethics-spinoza',
    'p:descartes',
  ],
  hume: [
    'p:hume',
    'n:edinburgh',
    'n:treatise-hume',
    'n:smith',
    'n:rousseau',
    'p:kant',
  ],
  kant: [
    'p:kant',
    'a:kant-critique',
    'u:newton',
    'p:hume',
    'u:albertina',
    'u:enlightenment',
  ],
  schopenhauer: [
    'p:schopenhauer',
    'n:danzig',
    'n:world-will',
    'p:kant',
    'n:frankfurt',
    'n:goethe',
  ],
  mill: [
    'p:mill',
    'u:liberty',
    'u:wordsworth',
    'u:enlightenment',
    'u:east-india',
    'a:harriet',
  ],
  nietzsche: [
    'p:nietzsche',
    'n:basel',
    'p:schopenhauer',
    'n:zarathustra',
    'n:turin',
    'n:genealogy',
  ],
  wittgenstein: [
    'p:wittgenstein',
    'n:russell',
    'n:tractatus-wittgenstein',
    'n:trinity',
    'n:duck-rabbit',
    'p:schopenhauer',
  ],
  sartre: [
    'p:sartre',
    'n:sorbonne',
    'n:deux-magots',
    'p:beauvoir',
    'p:camus',
    'u:udhr',
  ],
  camus: [
    'p:camus',
    'n:algiers',
    'n:tipasa',
    'p:sartre',
    'u:udhr',
    'n:sisyphus',
  ],
  beauvoir: [
    'p:beauvoir',
    'n:sorbonne',
    'p:sartre',
    'u:women',
    'n:suffrage',
    'n:deux-magots',
  ],
  arendt: [
    'p:arendt',
    'n:arendt-marburg',
    'u:udhr',
    'u:capitol',
    'u:constitution',
    'n:jaspers',
  ],
  confucius: [
    'p:confucius',
    'n:ritual-bronze',
    'n:qufu',
    'n:confucius-teaching',
    'n:analects',
    'p:mencius',
  ],
  mencius: [
    'p:mencius',
    'n:zhou-map',
    'p:confucius',
    'n:mencius-temple',
    'n:mencius-book',
    'n:ritual-bronze',
  ],
  zhuangzi: [
    'p:zhuangzi',
    'n:zhou-map',
    'n:laozi',
    'n:zhuangzi-book',
    'n:zhuangzi-butterfly',
    'n:ritual-bronze',
  ],
  buddha: [
    'p:buddha',
    'n:sanchi',
    'n:bodhgaya',
    'n:sarnath',
    'n:tripitaka',
    'n:deer-wheel',
  ],
  wonhyo: [
    'p:wonhyo',
    'n:gyeongju',
    'n:oseosa',
    'n:bunhwangsa',
    'n:tripitaka',
    'p:buddha',
  ],
  'jeong-yakyong': [
    'p:jeong-yakyong',
    'n:dasan-house',
    'n:geojunggi',
    'n:hwaseong',
    'n:gyungseyupyo',
    'n:mokmin',
  ],
  rawls: [
    'p:rawls',
    'u:constitution',
    'u:capitol',
    'u:udhr',
    'a:harvard',
    'u:school',
  ],
};
// Article-specific selections keep imagery tied to its topic and make the two
// covers distinct. No generic random image assignment at migration/runtime.
const overrides: Record<string, readonly string[]> = {
  'socrates-elenchus': [
    'n:agora',
    'p:socrates',
    'p:plato',
    'u:academy',
    'n:death-socrates',
    'n:athens-map',
  ],
  'plato-forms': [
    'n:school-athens',
    'p:plato',
    'u:academy',
    'p:socrates',
    'n:agora',
    'n:athens-map',
  ],
  'aristotle-causes': [
    'u:lyceum',
    'p:aristotle',
    'u:academy',
    'u:lesbos',
    'u:stagira',
    'a:aristotle-raphael',
  ],
  'epicurus-pleasure': [
    'n:rerum',
    'p:epicurus',
    'n:pompeii-garden',
    'n:lucretius',
    'n:democritus',
    'n:agora',
  ],
  'epictetus-disciplines': [
    'u:enchiridion',
    'p:epictetus',
    'u:zeno',
    'u:stoa',
    'u:arrian-front',
    'a:nicopolis',
  ],
  'marcus-cosmopolis': [
    'u:marcus',
    'p:marcus-aurelius',
    'n:forum',
    'u:stoa',
    'p:epictetus',
    'n:column-marcus',
  ],
  'augustine-time': [
    'n:confessions',
    'p:augustine',
    'n:augustine-study',
    'n:milan',
    'n:hippo',
    'n:carthage',
  ],
  'aquinas-law': [
    'n:summa',
    'p:aquinas',
    'n:albert',
    'n:notre-dame',
    'p:aristotle',
    'n:naples',
  ],
  'descartes-doubt': [
    'n:meditations-descartes',
    'p:descartes',
    'n:discourse',
    'n:leiden',
    'u:newton',
    'n:christina',
  ],
  'spinoza-freedom': [
    'n:ethics-spinoza',
    'p:spinoza',
    'p:descartes',
    'n:rijnsburg',
    'n:tractatus-spinoza',
    'n:amsterdam-view',
  ],
  'hume-causation': [
    'n:treatise-hume',
    'p:hume',
    'n:edinburgh',
    'p:kant',
    'n:smith',
    'n:rousseau',
  ],
  'kant-peace': [
    'u:peace',
    'p:kant',
    'u:constitution',
    'u:capitol',
    'u:udhr',
    'u:enlightenment',
  ],
  'schopenhauer-will': [
    'n:world-will',
    'p:kant',
    'p:schopenhauer',
    'n:frankfurt',
    'n:goethe',
    'n:danzig',
  ],
  'mill-women': [
    'u:women',
    'p:mill',
    'n:suffrage',
    'u:liberty',
    'a:harriet',
    'u:wordsworth',
  ],
  'nietzsche-genealogy': [
    'n:genealogy',
    'p:nietzsche',
    'n:zarathustra',
    'p:schopenhauer',
    'n:turin',
    'n:basel',
  ],
  'wittgenstein-language': [
    'n:duck-rabbit',
    'p:wittgenstein',
    'n:trinity',
    'n:tractatus-wittgenstein',
    'n:russell',
    'p:schopenhauer',
  ],
  'sartre-bad-faith': [
    'n:deux-magots',
    'p:sartre',
    'n:sorbonne',
    'p:beauvoir',
    'u:udhr',
    'p:camus',
  ],
  'camus-absurd': [
    'n:sisyphus',
    'p:camus',
    'n:tipasa',
    'n:algiers',
    'u:udhr',
    'p:sartre',
  ],
  'beauvoir-other': [
    'n:suffrage',
    'p:beauvoir',
    'n:sorbonne',
    'u:women',
    'p:sartre',
    'n:deux-magots',
  ],
  'arendt-action': [
    'u:capitol',
    'p:arendt',
    'n:arendt-marburg',
    'u:constitution',
    'u:udhr',
    'n:jaspers',
  ],
  'confucius-ren-li': [
    'n:confucius-teaching',
    'p:confucius',
    'n:ritual-bronze',
    'n:analects',
    'n:qufu',
    'p:mencius',
  ],
  'mencius-sprouts': [
    'n:mencius-book',
    'p:mencius',
    'p:confucius',
    'n:mencius-temple',
    'n:zhou-map',
    'n:ritual-bronze',
  ],
  'zhuangzi-perspectives': [
    'n:zhuangzi-butterfly',
    'p:zhuangzi',
    'n:zhuangzi-book',
    'n:zhou-map',
    'n:laozi',
    'n:ritual-bronze',
  ],
  'buddha-four-truths': [
    'n:deer-wheel',
    'p:buddha',
    'n:bodhgaya',
    'n:sanchi',
    'n:sarnath',
    'n:tripitaka',
  ],
  'wonhyo-hwajaeng': [
    'n:tripitaka',
    'p:wonhyo',
    'n:bunhwangsa',
    'p:buddha',
    'n:oseosa',
    'n:gyeongju',
  ],
  'dasan-mokmin': [
    'n:mokmin',
    'p:jeong-yakyong',
    'n:dasan-house',
    'n:heumheum',
    'n:gyungseyupyo',
    'n:hwaseong',
  ],
  'rawls-peoples': [
    'u:udhr',
    'p:rawls',
    'u:capitol',
    'u:constitution',
    'u:food',
    'a:harvard',
  ],
  'odyssey-1': [
    'n:penelope',
    'n:ithaca',
    'n:telemachus-vase',
    'n:athena',
    'p:odysseus',
    'n:odyssey-homer',
  ],
  'odyssey-2': [
    'n:nausicaa',
    'n:calypso',
    'n:ithaca',
    'n:athena',
    'p:odysseus',
    'n:odyssey-homer',
  ],
  'odyssey-3': [
    'n:polyphemus',
    'p:odysseus',
    'n:circe',
    'n:sirens',
    'n:calypso',
    'n:odyssey-homer',
  ],
  'odyssey-4': [
    'p:odysseus',
    'n:ithaca',
    'n:telemachus-vase',
    'n:eurycleia-scar',
    'n:penelope',
    'n:odyssey-homer',
  ],
  'odyssey-5': [
    'n:bow',
    'p:odysseus',
    'n:eurycleia',
    'n:penelope',
    'n:athena',
    'n:odyssey-homer',
  ],
};

export function libraryImages(article: LibraryArticle): SlideImage[] {
  const keys = overrides[article.key] || sets[article.philosopher];
  if (!keys || keys.length !== article.cards.length + 2)
    throw new Error(`Incomplete images: ${article.key}`);
  const images = keys.map((ref) => {
    const [collection, key] = ref.split(':');
    if (collection === 'p') {
      const image = portraits.find((i) => i.key === key);
      if (!image) throw new Error(`Missing portrait: ${ref}`);
      return { ...image, caption: image.note };
    }
    const catalog =
      collection === 'n'
        ? additions
        : collection === 'u'
          ? unique
          : collection === 'a'
            ? prior
            : works;
    const image = catalog.find((i) => i.key === key);
    if (!image) throw new Error(`Missing library image: ${ref}`);
    return image;
  });
  for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
    if (new Set(images.map((i) => i[field])).size !== images.length)
      throw new Error(`Repeated ${field}: ${article.key}`);
  return images;
}

export function libraryCredits(article: LibraryArticle): string {
  return [
    '더 읽기 · 자료 출처',
    ...article.references,
    '슬라이드 이미지 안내\n표지부터 순서대로 서로 다른 자료를 사용했습니다. 후대 재현화·유적·옛 판본·관련 인물과 제도의 사진은 본문을 이해하기 위한 자료입니다. 당시의 실제 장면이나 추상 이론의 직접적인 증거로 제시한 것이 아닙니다.',
    ...libraryImages(article).map(
      (i, n) =>
        `${n + 1}번 슬라이드\n${i.caption}\n${i.creator}\n${i.sourceUrl}\n${i.license}\n${i.licenseUrl}\n${i.changes}`,
    ),
    '본문은 자료를 참고하여 새로 쓴 한국어 요약·해설입니다. 직접 인용이나 특정 현대 번역의 전재가 아닙니다.',
  ].join('\n\n');
}
