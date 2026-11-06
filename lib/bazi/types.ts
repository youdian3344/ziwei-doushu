import type { BirthInfo } from '@/lib/ziwei/types';
import type {
  CangGanRole, ChangSheng, Dizhi, ShiShen, ShiShenGroup, Tiangan, WuXing, WuXingMonthStatus, YinYang,
} from './tables';

export type PillarKey = 'year' | 'month' | 'day' | 'hour';

/** 柱中每个地支所藏之干及其十神 */
export interface BaziHideGan {
  gan: Tiangan;
  wuXing: WuXing;
  role: CangGanRole;
  shiShen: ShiShen;
}

export interface BaziPillar {
  key: PillarKey;
  /** 年柱 / 月柱 / 日柱 / 时柱 */
  label: string;
  gan: Tiangan;
  zhi: Dizhi;
  ganZhi: string;
  ganWuXing: WuXing;
  zhiWuXing: WuXing;
  ganYinYang: YinYang;
  /** 天干十神；日柱天干记 '日主' */
  ganShiShen: ShiShen | '日主';
  hideGan: BaziHideGan[];
  /** 地支本气相对日主的十神（取用神/格局时的常用口径） */
  benQiShiShen: ShiShen;
  naYin: string;
  /** 日干在该支的十二长生位（星运/地势） */
  diShi: ChangSheng;
  xun: string;
  xunKong: string;
  isDayMaster: boolean;
}

export interface BaziWuXingStat {
  /** 只计天干与地支本身的五行（不计藏干） */
  surface: Record<WuXing, number>;
  /** 计入藏干，按本气 1、中气 0.5、余气 0.3 加权 */
  withCangGan: Record<WuXing, number>;
  missing: WuXing[];
  strongest: WuXing[];
  /** 各五行在月令的旺相休囚死 */
  monthStatus: Record<WuXing, WuXingMonthStatus>;
  /** 各五行对应日主视角的十神大类 */
  shiShenGroups: Record<WuXing, ShiShenGroup>;
}

export type WangShuaiVerdict = '极旺(可能从强)' | '偏旺' | '中和' | '偏弱' | '极弱(可能从弱)';

export interface WangShuaiResult {
  score: number;
  verdict: WangShuaiVerdict;
  confidence: '高' | '中' | '低';
  breakdown: {
    deLing: number;
    changSheng: number;
    deDi: number;
    deShi: number;
    details: string[];
  };
}

export interface GeJuResult {
  primary: string;
  basis: string;
  touGan: Tiangan[];
  confidence: '高' | '中' | '低';
  notes: string[];
}

export interface GanRelation {
  type: '天干合' | '天干相克';
  gans: Tiangan[];
  pillars: string[];
}

export interface ZhiRelation {
  type: '六冲' | '六合' | '三合' | '三会' | '相刑' | '自刑' | '六害' | '暗合' | '拱合' | '拱会';
  zhi: Dizhi[];
  pillars: string[];
  detail?: string;
}

export interface PillarVerdict {
  pillar: string;
  gan: Tiangan;
  zhi: Dizhi;
  verdict: '盖头' | '截脚' | '天干生地支' | '地支生天干' | '天地同气';
}

/** 干支对（大运、流年、小运、胎元等都用这个形状） */
export interface GanZhiItem {
  gan: Tiangan;
  zhi: Dizhi;
  ganZhi: string;
  naYin: string;
}

export interface LiuNianInfo {
  year: number;
  /** 虚岁 */
  age: number;
  ganZhi: string;
  gan: Tiangan;
  zhi: Dizhi;
  /** 流年天干相对日主的十神 */
  ganShiShen: ShiShen;
}

export interface DaYunInfo {
  index: number;
  ganZhi: string;
  gan: Tiangan | null;
  zhi: Dizhi | null;
  ganShiShen: ShiShen | null;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  isCurrent: boolean;
  liuNian: LiuNianInfo[];
}

export interface XiaoYunInfo {
  year: number;
  age: number;
  ganZhi: string;
  ganShiShen: ShiShen | null;
}

export interface YunInfo {
  /** true 顺行（阳男阴女），false 逆行 */
  forward: boolean;
  startYear: number;
  startMonth: number;
  startDay: number;
  /** 如「7年5月0日起运」 */
  startText: string;
  /** 起运公历日期，如 1997-11-15 */
  startSolar: string;
  daYun: DaYunInfo[];
}

export interface BaziJieQi {
  prevName?: string;
  prevTime?: string;
  nextName?: string;
  nextTime?: string;
}

export interface BaziChart {
  birthInfo: BirthInfo;
  /** 实际用于排盘的公历时刻（时辰取中点，子时取 00:00） */
  solar: { year: number; month: number; day: number; hour: number; minute: number };
  lunar: { year: number; month: number; day: number; isLeap: boolean; text: string };
  pillars: Record<PillarKey, BaziPillar>;
  dayMaster: { gan: Tiangan; wuXing: WuXing; yinYang: YinYang };
  wuXing: BaziWuXingStat;
  wangShuai: WangShuaiResult;
  geJu: GeJuResult;
  /** 调候用神（《穷通宝鉴》） */
  tiaoHou: { yongShen: string[]; primary: string; note: string };
  ganRelations: GanRelation[];
  zhiRelations: ZhiRelation[];
  pillarVerdicts: PillarVerdict[];
  /** 胎元、胎息、命宫、身宫 */
  aux: { taiYuan: GanZhiItem; taiXi: GanZhiItem; mingGong: GanZhiItem; shenGong: GanZhiItem };
  jieQi: BaziJieQi;
  yun: YunInfo;
  /** 起运前的小运（《渊海子平》小运法） */
  xiaoYun: XiaoYunInfo[];
  currentYear: number;
  currentAge: number;
  currentDaYunIndex?: number;
  currentLiuNian?: LiuNianInfo;
}