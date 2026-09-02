import { LANGUAGE } from './i18n';
import type { FourthEndingId, FourthPace, FourthResponse } from './types';

type Localized = { zh: string; en: string };

interface FourthResponseCopy {
  label: Localized;
  text: Localized;
  endingTitle: Localized;
  endingBody: Localized;
}

interface FourthPaceCopy {
  choice: Localized;
  short: Localized;
  description: Localized;
  reflection: Localized;
  responses: Record<FourthResponse, FourthResponseCopy>;
}

const localized = (value: Localized): string => LANGUAGE === 'zh-CN' ? value.zh : value.en;

export const FOURTH_PACE_ORDER: readonly FourthPace[] = ['fast', 'slow', 'normal'];
export const FOURTH_RESPONSE_ORDER: readonly FourthResponse[] = ['self', 'others', 'accept'];
export const FOURTH_ENDING_IDS: readonly FourthEndingId[] = FOURTH_PACE_ORDER.flatMap((pace) =>
  FOURTH_RESPONSE_ORDER.map((response) => `${pace}-${response}` as FourthEndingId),
);

const COPY: Record<FourthPace, FourthPaceCopy> = {
  fast: {
    choice: { zh: '我想要快速地走', en: 'I want to walk fast' },
    short: { zh: '高速', en: 'FAST' },
    description: { zh: '用最高速度穿过人群', en: 'Cut through the crowd at top speed' },
    reflection: { zh: '发生了那么多的碰撞，心力焦脆', en: 'So many collisions have left you exhausted and frayed.' },
    responses: {
      self: {
        label: { zh: '怪自己', en: 'Blame yourself' },
        text: { zh: '我真是太鲁莽了，我真是个烂坏人。', en: 'I was reckless. I must be a terrible person.' },
        endingTitle: { zh: '妄自菲薄（高速版）', en: 'Self-Abasement · Fast' },
        endingBody: { zh: '你把一路上的碰撞都判给了自己，把速度变成了罪证。', en: 'You turn every collision into evidence against yourself.' },
      },
      others: {
        label: { zh: '怪别人', en: 'Blame others' },
        text: { zh: '周围人都是傻逼，碍事的蠢货。', en: 'Everyone around me is an idiot getting in the way.' },
        endingTitle: { zh: '愤世嫉俗（高速版）', en: 'Cynicism · Fast' },
        endingBody: { zh: '你把道路看成战场，把所有慢下来的人都视为敌人。', en: 'The road becomes a battlefield, and every slower walker an enemy.' },
      },
      accept: {
        label: { zh: '接受撞人', en: 'Accept the collisions' },
        text: { zh: '要走得快，就是会撞到其他人。', en: 'Walking fast means I will collide with other people.' },
        endingTitle: { zh: '接受一切（高速版）', en: 'Acceptance · Fast' },
        endingBody: { zh: '你承认高速有代价，也承认这是自己选的走法。', en: 'You accept the cost of speed and the choice that created it.' },
      },
    },
  },
  slow: {
    choice: { zh: '我想要慢速地走', en: 'I want to walk slowly' },
    short: { zh: '慢速', en: 'SLOW' },
    description: { zh: '比人群更慢，留出自己的节奏', en: 'Move below the crowd pace and keep your own rhythm' },
    reflection: { zh: '被人撞了太多次，心情低落', en: 'You were hit too many times, and your mood has sunk.' },
    responses: {
      self: {
        label: { zh: '怪自己', en: 'Blame yourself' },
        text: { zh: '我太敏感矫情了，是我的问题。', en: 'I am too sensitive. This is my problem.' },
        endingTitle: { zh: '妄自菲薄（慢速版）', en: 'Self-Abasement · Slow' },
        endingBody: { zh: '你为自己的节奏道歉，仿佛被撞也是一种过错。', en: 'You apologize for your rhythm, as though being hit were your fault.' },
      },
      others: {
        label: { zh: '怪别人', en: 'Blame others' },
        text: { zh: '所有人都是混蛋，人类真讨厌。', en: 'Everyone is awful. People are unbearable.' },
        endingTitle: { zh: '愤世嫉俗（慢速版）', en: 'Cynicism · Slow' },
        endingBody: { zh: '你缩进自己的步速里，也把整个人群推到了对立面。', en: 'You retreat into your pace and place the whole crowd against you.' },
      },
      accept: {
        label: { zh: '接受被撞', en: 'Accept being hit' },
        text: { zh: '要慢慢走，就会成为他人的障碍，被撞很正常。', en: 'Walking slowly can obstruct others. Being hit is part of it.' },
        endingTitle: { zh: '接受一切（慢速版）', en: 'Acceptance · Slow' },
        endingBody: { zh: '你没有加快，也没有控诉，只接受慢下来会承受的摩擦。', en: 'You neither hurry nor accuse; you accept the friction of slowing down.' },
      },
    },
  },
  normal: {
    choice: { zh: '我想跟大家一样速度地走', en: 'I want to walk at everyone else’s pace' },
    short: { zh: '平速', en: 'AVERAGE' },
    description: { zh: '采用人群的平均速度', en: 'Match the average speed of the crowd' },
    reflection: { zh: '平平淡淡的路，毫无波澜', en: 'The walk was perfectly ordinary and completely uneventful.' },
    responses: {
      self: {
        label: { zh: '怪自己', en: 'Blame yourself' },
        text: { zh: '我真是太平庸了，太懦弱了。', en: 'I am painfully ordinary and too timid.' },
        endingTitle: { zh: '妄自菲薄（平速版）', en: 'Self-Abasement · Average' },
        endingBody: { zh: '没有冲突也成了缺点，你开始责怪自己不够特别。', en: 'Even the absence of conflict becomes proof that you are not special enough.' },
      },
      others: {
        label: { zh: '怪别人', en: 'Blame others' },
        text: { zh: '这世道真庸俗，人人都好无聊。', en: 'This world is vulgar. Everyone is so boring.' },
        endingTitle: { zh: '愤世嫉俗（平速版）', en: 'Cynicism · Average' },
        endingBody: { zh: '你走在人群中央，却用轻蔑把自己和所有人隔开。', en: 'You walk among the crowd while contempt keeps everyone at a distance.' },
      },
      accept: {
        label: { zh: '接受平淡', en: 'Accept the ordinary' },
        text: { zh: '随大流，平淡挺好。', en: 'Going with the flow can be perfectly fine.' },
        endingTitle: { zh: '接受一切（平速版）', en: 'Acceptance · Average' },
        endingBody: { zh: '这一次没有戏剧。你允许普通的一段路只是普通。', en: 'Nothing dramatic happened, and you allow an ordinary walk to stay ordinary.' },
      },
    },
  },
};

export function makeFourthEndingId(pace: FourthPace, response: FourthResponse): FourthEndingId {
  return `${pace}-${response}`;
}

export function getFourthPaceCopy(pace: FourthPace) {
  const copy = COPY[pace];
  return {
    choice: localized(copy.choice),
    short: localized(copy.short),
    description: localized(copy.description),
    reflection: localized(copy.reflection),
  };
}

export function getFourthResponseCopy(pace: FourthPace, response: FourthResponse) {
  const copy = COPY[pace].responses[response];
  return {
    label: localized(copy.label),
    text: localized(copy.text),
    endingTitle: localized(copy.endingTitle),
    endingBody: localized(copy.endingBody),
  };
}

export function getFourthEndingCopy(id: FourthEndingId) {
  const [pace, response] = id.split('-') as [FourthPace, FourthResponse];
  return {
    id,
    pace,
    response,
    paceCopy: getFourthPaceCopy(pace),
    responseCopy: getFourthResponseCopy(pace, response),
  };
}
