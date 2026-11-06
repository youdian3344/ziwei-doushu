/**
 * 八字命理分析 —— 五行统计、旺衰、格局、干支关系、整柱盖头截脚。
 *
 * 判定口径（子平通用法，与《子平真诠》《滴天髓》取法一致）：
 * · 旺衰 = 得令（月令本气十神）+ 长生修正（日干在月支的十二长生位）+ 得地（年日时三支藏干）+ 得势（年月时三干）
 * · 格局 = 以月令为纲（《子平真诠》「八字用神，专求月令」）：纯气月支直接立格，
 *   四生/四库月支先看月令藏干透干，本气未透则取藏干并以「中」置信度标注
 * · 调候 = 《穷通宝鉴》日干 × 月支查表
 */

import {
  CHANG_SHENG_ORDER, DIZHI, GAN_HE, GAN_WUXING, GAN_YINYANG, SHI_SHEN_TO_GE, WUXING_LIST,
  WUXING_REP_GAN, ZHI_CANG_GAN, ZHI_WUXING, getChangSheng, getShiShen, getWuXingMonthStatus, shengKe,
  shiShenGroup,
  type Dizhi, type ShiShen, type ShiShenGroup, type Tiangan, type WuXing,
} from './tables';
import type {
  BaziWuXingStat, GanRelation, GeJuResult, PillarKey, PillarVerdict, WangShuaiResult, ZhiRelation,
} from './types';

export const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];
export const PILLAR_LABELS: Record<PillarKey, string> = { year: '年', month: '月', day: '日', hour: '时' };
export const OTHERS: Record<PillarKey, PillarKey[]> = {
  year: ['month', 'day', 'hour'],
  month: ['year', 'day', 'hour'],
  day: ['year', 'month', 'hour'],
  hour: ['year', 'month', 'day'],
};

export type SiZhuGanZhi = Record<PillarKey, { gan: Tiangan; zhi: Dizhi }>;

/** 藏干在旺衰/计数中的权重 */
const CANG_GAN_WEIGHT = { benqi: 1, zhongqi: 0.5, yuqi: 0.3 } as const;

/** 月支本气对日主的加分（十神 → 分值），体现《子平真诠》「月令为重」 */
const MONTH_ORDER_SCORE: Record<ShiShen, number> = {
  比肩: 5, 劫财: 5, 正印: 3, 偏印: 3, 食神: -3, 伤官: -3, 正官: -4, 七杀: -4, 偏财: -5, 正财: -5,
};

/** 得势：年/月/时三干对日主的加分 */
const STEM_SCORE: Record<ShiShen, number> = {
  比肩: 1, 劫财: 1, 正印: 0.7, 偏印: 0.7, 食神: -0.5, 伤官: -0.5, 正官: -1.5, 七杀: -1.5, 偏财: -1, 正财: -1,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function isBiJie(ss: ShiShen): boolean {
  return ss === '比肩' || ss === '劫财';
}

function isYin(ss: ShiShen): boolean {
  return ss === '正印' || ss === '偏印';
}

/** 五行统计：字面五行与含藏干加权两套口径 */
export function countWuXing(siZhu: SiZhuGanZhi, dayMaster: Tiangan): BaziWuXingStat {
  const surface = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 } as Record<WuXing, number>;
  const withCangGan = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 } as Record<WuXing, number>;

  for (const key of PILLAR_KEYS) {
    const { gan, zhi } = siZhu[key];
    surface[GAN_WUXING[gan]] += 1;
    surface[ZHI_WUXING[zhi]] += 1;
    withCangGan[GAN_WUXING[gan]] += 1;
    for (const cg of ZHI_CANG_GAN[zhi]) {
      withCangGan[GAN_WUXING[cg.gan]] += CANG_GAN_WEIGHT[cg.role];
    }
  }
  for (const wx of WUXING_LIST) withCangGan[wx] = round2(withCangGan[wx]);

  const missing = WUXING_LIST.filter((w) => surface[w] === 0);
  const maxCount = Math.max(...WUXING_LIST.map((w) => surface[w]));
  const strongest = WUXING_LIST.filter((w) => surface[w] === maxCount);

  const monthStatus = getWuXingMonthStatus(siZhu.month.zhi);
  const shiShenGroups = {} as Record<WuXing, ShiShenGroup>;
  for (const wx of WUXING_LIST) {
    shiShenGroups[wx] = shiShenGroup(getShiShen(dayMaster, WUXING_REP_GAN[wx]));
  }

  return { surface, withCangGan, missing, strongest, monthStatus, shiShenGroups };
}

/** 旺衰判定 */
export function judgeWangShuai(siZhu: SiZhuGanZhi): WangShuaiResult {
  const dm = siZhu.day.gan;
  const monthZhi = siZhu.month.zhi;
  const monthCang = ZHI_CANG_GAN[monthZhi];
  const benqi = monthCang[0].gan;
  const benqiSS = getShiShen(dm, benqi);

  const details: string[] = [];
  let deLing = MONTH_ORDER_SCORE[benqiSS];
  details.push(`月支本气${benqi}（${benqiSS}）${deLing >= 0 ? '+' : ''}${deLing}`);
  for (const cg of monthCang.slice(1)) {
    const ss = getShiShen(dm, cg.gan);
    if (isBiJie(ss)) { deLing += 1; details.push(`月支余气${cg.gan}为${ss} +1`); }
    else if (isYin(ss)) { deLing += 0.7; details.push(`月支余气${cg.gan}为${ss} +0.7`); }
  }
  deLing = round2(deLing);

  const cs = getChangSheng(dm, monthZhi);
  let changSheng = 0;
  if (cs === '长生' || cs === '帝旺') changSheng = 2;
  else if (cs === '临官' || cs === '冠带') changSheng = 1;
  else if (cs === '沐浴' || cs === '衰') changSheng = 0;
  else if (cs === '病' || cs === '死') changSheng = -1;
  else changSheng = -3;
  details.push(`日主${dm}在月支${monthZhi}为${cs} ${changSheng >= 0 ? '+' : ''}${changSheng}`);

  let deDi = 0;
  for (const key of ['year', 'day', 'hour'] as PillarKey[]) {
    const zhi = siZhu[key].zhi;
    for (const cg of ZHI_CANG_GAN[zhi]) {
      const ss = getShiShen(dm, cg.gan);
      if (isBiJie(ss)) {
        const add = cg.role === 'benqi' ? 2 : cg.role === 'zhongqi' ? 0.8 : 0.5;
        deDi += add;
        details.push(`${PILLAR_LABELS[key]}支${zhi}藏${cg.gan}（${ss}·本中余${cg.role}）+${add}`);
      } else if (isYin(ss)) {
        const add = cg.role === 'benqi' ? 1 : cg.role === 'zhongqi' ? 0.5 : 0.3;
        deDi += add;
        details.push(`${PILLAR_LABELS[key]}支${zhi}藏${cg.gan}（${ss}）+${add}`);
      }
    }
  }
  deDi = round2(deDi);

  let deShi = 0;
  for (const key of ['year', 'month', 'hour'] as PillarKey[]) {
    const gan = siZhu[key].gan;
    const ss = getShiShen(dm, gan);
    const v = STEM_SCORE[ss];
    deShi += v;
    details.push(`${PILLAR_LABELS[key]}干${gan}（${ss}）${v >= 0 ? '+' : ''}${v}`);
  }
  deShi = round2(deShi);

  const score = round2(deLing + changSheng + deDi + deShi);

  let verdict: WangShuaiResult['verdict'];
  if (score >= 8) verdict = '极旺(可能从强)';
  else if (score >= 3) verdict = '偏旺';
  else if (score > -2.5) verdict = '中和';
  else if (score > -8) verdict = '偏弱';
  else verdict = '极弱(可能从弱)';

  const dist = Math.min(
    Math.abs(score - 3), Math.abs(score + 2.5), Math.abs(score - 8), Math.abs(score + 8),
  );
  const confidence: WangShuaiResult['confidence'] = dist > 2 ? '高' : dist > 0.8 ? '中' : '低';

  return { score, verdict, confidence, breakdown: { deLing, changSheng, deDi, deShi, details } };
}

/** 格局判定（以月令为纲） */
export function judgeGeJu(siZhu: SiZhuGanZhi): GeJuResult {
  const dm = siZhu.day.gan;
  const monthZhi = siZhu.month.zhi;
  const cangGan = ZHI_CANG_GAN[monthZhi];
  const benqi = cangGan[0].gan;
  const benqiSS = getShiShen(dm, benqi);

  const otherGans: Tiangan[] = [siZhu.year.gan, siZhu.month.gan, siZhu.hour.gan];
  const touGan = cangGan.filter((cg) => otherGans.includes(cg.gan)).map((cg) => cg.gan);

  const notes: string[] = [];
  const isPureMonth = ['子', '午', '卯', '酉'].includes(monthZhi);

  let primary: string;
  let basis: string;
  let confidence: GeJuResult['confidence'] = '高';

  if (isPureMonth) {
    primary = SHI_SHEN_TO_GE[benqiSS];
    basis = `月支${monthZhi}本气${benqi}（${benqiSS}）——纯气月支，直接立格`;
  } else {
    const touSS = touGan
      .map((g) => ({ gan: g, ss: getShiShen(dm, g) }))
      .filter((x) => !isBiJie(x.ss));
    if (touSS.length > 0) {
      const benqiTou = touSS.find((x) => x.gan === benqi);
      if (benqiTou) {
        primary = SHI_SHEN_TO_GE[benqiTou.ss];
        basis = `月支${monthZhi}本气${benqi}透干（${benqiTou.ss}）`;
      } else {
        const first = touSS[0];
        primary = SHI_SHEN_TO_GE[first.ss];
        basis = `月支${monthZhi}藏干${first.gan}透干（${first.ss}）`;
        confidence = '中';
        notes.push(`月支本气${benqi}未透，取藏干${first.gan}立格（${first.ss}格）`);
      }
    } else {
      primary = SHI_SHEN_TO_GE[benqiSS];
      basis = `月支${monthZhi}本气${benqi}（${benqiSS}）——本气未透，以本气论格`;
      if (!isBiJie(benqiSS)) confidence = '中';
    }
  }

  // 比劫当令：现代按比肩/劫财格论，同时按传统标出建禄、月刃
  if (benqiSS === '比肩' || benqiSS === '劫财') {
    const isBi = benqiSS === '比肩';
    primary = isBi ? '比肩格' : '劫财格';
    basis = `月支本气${benqi}为日主${isBi ? '比肩' : '劫财'}——${isBi ? '比肩' : '劫财'}格`;
    confidence = '高';
    notes.length = 0;
    const cs = getChangSheng(dm, monthZhi);
    if (isBi && cs === '临官') notes.push(`日干${dm}在月支${monthZhi}为临官——传统称「建禄格」`);
    else if (isBi) notes.push(`日干${dm}在月支${monthZhi}为${cs}（非临官）——传统子平派不立建禄，现代按比肩格论`);
    else if (cs === '帝旺') {
      const trad = GAN_YINYANG[dm] === '阳' ? '羊刃格' : '月刃格（阴干月刃有争议）';
      notes.push(`日干${dm}在月支${monthZhi}为帝旺——传统称「${trad}」`);
    } else notes.push(`日干${dm}在月支${monthZhi}为${cs}（非帝旺）——传统不立月刃，现代按劫财格论`);
  }

  return { primary, basis, touGan, confidence, notes };
}

/** 天干关系：五合与相克 */
export function detectGanRelations(siZhu: SiZhuGanZhi): GanRelation[] {
  const out: GanRelation[] = [];
  const list = PILLAR_KEYS.map((k) => ({ pillar: PILLAR_LABELS[k], gan: siZhu[k].gan }));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const he = GAN_HE[a.gan] === b.gan;
      if (he) {
        out.push({ type: '天干合', gans: [a.gan, b.gan], pillars: [a.pillar, b.pillar] });
        continue;
      }
      const rel = shengKe(GAN_WUXING[a.gan], GAN_WUXING[b.gan]);
      if (rel === '克' || rel === '被克') {
        out.push({ type: '天干相克', gans: [a.gan, b.gan], pillars: [a.pillar, b.pillar] });
      }
    }
  }
  return out;
}

const LIU_CHONG: Array<[Dizhi, Dizhi]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];
const LIU_HE: Array<[Dizhi, Dizhi]> = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
];
const LIU_HAI: Array<[Dizhi, Dizhi]> = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];
const SAN_HE: Array<{ zhi: Dizhi[]; wuxing: string }> = [
  { zhi: ['申', '子', '辰'], wuxing: '水' },
  { zhi: ['亥', '卯', '未'], wuxing: '木' },
  { zhi: ['寅', '午', '戌'], wuxing: '火' },
  { zhi: ['巳', '酉', '丑'], wuxing: '金' },
];
const SAN_HUI: Array<{ zhi: Dizhi[]; wuxing: string }> = [
  { zhi: ['寅', '卯', '辰'], wuxing: '木' },
  { zhi: ['巳', '午', '未'], wuxing: '火' },
  { zhi: ['申', '酉', '戌'], wuxing: '金' },
  { zhi: ['亥', '子', '丑'], wuxing: '水' },
];
const XIANG_XING: Array<{ zhi: Dizhi[]; name: string }> = [
  { zhi: ['子', '卯'], name: '无礼之刑' },
  { zhi: ['寅', '巳', '申'], name: '恃势之刑' },
  { zhi: ['丑', '戌', '未'], name: '无恩之刑' },
];
const ZI_XING: Dizhi[] = ['辰', '午', '酉', '亥'];

/** 地支关系：冲、合、害、刑、自刑、三合三会、拱合拱会、暗合 */
export function detectZhiRelations(siZhu: SiZhuGanZhi): ZhiRelation[] {
  const out: ZhiRelation[] = [];
  const list = PILLAR_KEYS.map((k) => ({ pillar: PILLAR_LABELS[k], zhi: siZhu[k].zhi }));

  const pairs: Array<[typeof list[0], typeof list[0]]> = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) pairs.push([list[i], list[j]]);
  }

  const pushPair = (
    table: Array<[Dizhi, Dizhi]>,
    type: ZhiRelation['type'],
  ) => {
    for (const [a, b] of pairs) {
      if (table.some(([x, y]) => (a.zhi === x && b.zhi === y) || (a.zhi === y && b.zhi === x))) {
        out.push({ type, zhi: [a.zhi, b.zhi], pillars: [a.pillar, b.pillar] });
      }
    }
  };

  pushPair(LIU_CHONG, '六冲');
  pushPair(LIU_HE, '六合');
  pushPair(LIU_HAI, '六害');

  for (const xing of XIANG_XING) {
    const matched = list.filter((p) => xing.zhi.includes(p.zhi));
    const distinct = [...new Set(matched.map((m) => m.zhi))];
    if (xing.zhi.length === 2) {
      if (distinct.length === 2) {
        out.push({ type: '相刑', zhi: distinct, pillars: matched.map((m) => m.pillar), detail: xing.name });
      }
    } else if (distinct.length >= 2) {
      out.push({
        type: '相刑', zhi: distinct, pillars: matched.map((m) => m.pillar),
        detail: xing.name + (distinct.length === 3 ? '（全）' : '（半）'),
      });
    }
  }

  for (const zx of ZI_XING) {
    const matched = list.filter((p) => p.zhi === zx);
    if (matched.length >= 2) {
      out.push({ type: '自刑', zhi: [zx, zx], pillars: matched.map((m) => m.pillar) });
    }
  }

  for (const sh of SAN_HE) {
    const present = list.filter((p) => sh.zhi.includes(p.zhi));
    const distinct = [...new Set(present.map((p) => p.zhi))];
    if (distinct.length === 3) {
      out.push({ type: '三合', zhi: distinct, pillars: present.map((p) => p.pillar), detail: `三合${sh.wuxing}局` });
    } else if (distinct.length === 2) {
      const missing = sh.zhi.find((z) => !distinct.includes(z)) as Dizhi;
      out.push({ type: '拱合', zhi: distinct, pillars: present.map((p) => p.pillar), detail: `拱${missing}（${sh.wuxing}局）` });
    }
  }
  for (const sh of SAN_HUI) {
    const present = list.filter((p) => sh.zhi.includes(p.zhi));
    const distinct = [...new Set(present.map((p) => p.zhi))];
    if (distinct.length === 3) {
      out.push({ type: '三会', zhi: distinct, pillars: present.map((p) => p.pillar), detail: `三会${sh.wuxing}方` });
    } else if (distinct.length === 2) {
      const missing = sh.zhi.find((z) => !distinct.includes(z)) as Dizhi;
      out.push({ type: '拱会', zhi: distinct, pillars: present.map((p) => p.pillar), detail: `拱${missing}（${sh.wuxing}方）` });
    }
  }

  // 暗合：地支藏干相合；已有显式关系的地支对不再报暗合
  const explicitTypes: ZhiRelation['type'][] = ['六冲', '六合', '六害', '三合', '三会', '拱合', '拱会', '相刑', '自刑'];
  for (const [a, b] of pairs) {
    if (a.zhi === b.zhi) continue;
    const hasExplicit = out.some(
      (r) => explicitTypes.includes(r.type) && r.zhi.includes(a.zhi) && r.zhi.includes(b.zhi),
    );
    if (hasExplicit) continue;
    const hits: string[] = [];
    for (const ag of ZHI_CANG_GAN[a.zhi].map((c) => c.gan)) {
      for (const bg of ZHI_CANG_GAN[b.zhi].map((c) => c.gan)) {
        if (GAN_HE[ag] === bg) hits.push(`${ag}${bg}合`);
      }
    }
    if (hits.length) {
      out.push({ type: '暗合', zhi: [a.zhi, b.zhi], pillars: [a.pillar, b.pillar], detail: hits.join('、') });
    }
  }

  return out;
}

/** 整柱盖头截脚：天干与地支的五行生克 */
export function judgePillars(siZhu: SiZhuGanZhi): PillarVerdict[] {
  return PILLAR_KEYS.map((key) => {
    const { gan, zhi } = siZhu[key];
    const rel = shengKe(GAN_WUXING[gan], ZHI_WUXING[zhi]);
    let verdict: PillarVerdict['verdict'];
    if (rel === '克') verdict = '盖头';
    else if (rel === '被克') verdict = '截脚';
    else if (rel === '生') verdict = '天干生地支';
    else if (rel === '被生') verdict = '地支生天干';
    else verdict = '天地同气';
    return { pillar: PILLAR_LABELS[key], gan, zhi, verdict };
  });
}

/** 十二长生顺序表（供页面标注） */
export const CHANG_SHENG_SEQUENCE = CHANG_SHENG_ORDER;
export const DIZHI_SEQUENCE = DIZHI;