/**
 * 八字基础查表 —— 干支五行、阴阳、藏干、十神、十二长生、调候用神、月令旺相休囚死。
 *
 * 数据来源均为可在《渊海子平》《三命通会》《子平真诠》《滴天髓》等子平典籍中核对的通行表，
 * 其中调候用神一律以《穷通宝鉴》（又名《栏江网》）十干十二月调候用神表为准，共 120 格。
 * 本文件不含任何派别私有数据。
 */

export type Tiangan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Dizhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type WuXing = '木' | '火' | '土' | '金' | '水';
export type YinYang = '阳' | '阴';
export type ShiShen =
  | '比肩' | '劫财' | '食神' | '伤官' | '偏财'
  | '正财' | '七杀' | '正官' | '偏印' | '正印';
/** 十神五大类 */
export type ShiShenGroup = '比劫' | '食伤' | '财' | '官杀' | '印';
/** 藏干在支中的分量：本气 / 中气 / 余气 */
export type CangGanRole = 'benqi' | 'zhongqi' | 'yuqi';

export const TIANGAN: Tiangan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DIZHI: Dizhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const WUXING_LIST: WuXing[] = ['木', '火', '土', '金', '水'];

export const GAN_WUXING: Record<Tiangan, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export const GAN_YINYANG: Record<Tiangan, YinYang> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};

export const ZHI_WUXING: Record<Dizhi, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 地支藏干：顺序固定为 本气 → 中气 → 余气 */
export const ZHI_CANG_GAN: Record<Dizhi, Array<{ gan: Tiangan; role: CangGanRole }>> = {
  子: [{ gan: '癸', role: 'benqi' }],
  丑: [{ gan: '己', role: 'benqi' }, { gan: '癸', role: 'zhongqi' }, { gan: '辛', role: 'yuqi' }],
  寅: [{ gan: '甲', role: 'benqi' }, { gan: '丙', role: 'zhongqi' }, { gan: '戊', role: 'yuqi' }],
  卯: [{ gan: '乙', role: 'benqi' }],
  辰: [{ gan: '戊', role: 'benqi' }, { gan: '乙', role: 'zhongqi' }, { gan: '癸', role: 'yuqi' }],
  巳: [{ gan: '丙', role: 'benqi' }, { gan: '庚', role: 'zhongqi' }, { gan: '戊', role: 'yuqi' }],
  午: [{ gan: '丁', role: 'benqi' }, { gan: '己', role: 'zhongqi' }],
  未: [{ gan: '己', role: 'benqi' }, { gan: '丁', role: 'zhongqi' }, { gan: '乙', role: 'yuqi' }],
  申: [{ gan: '庚', role: 'benqi' }, { gan: '壬', role: 'zhongqi' }, { gan: '戊', role: 'yuqi' }],
  酉: [{ gan: '辛', role: 'benqi' }],
  戌: [{ gan: '戊', role: 'benqi' }, { gan: '辛', role: 'zhongqi' }, { gan: '丁', role: 'yuqi' }],
  亥: [{ gan: '壬', role: 'benqi' }, { gan: '甲', role: 'zhongqi' }],
};

/** 五行相生 / 相克链 */
export const WUXING_SHENG: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
export const WUXING_KE: Record<WuXing, WuXing> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

/** a 相对 b 的五行关系（以 a 为主体） */
export function shengKe(a: WuXing, b: WuXing): '生' | '克' | '同' | '被生' | '被克' {
  if (a === b) return '同';
  if (WUXING_SHENG[a] === b) return '生';
  if (WUXING_KE[a] === b) return '克';
  if (WUXING_SHENG[b] === a) return '被生';
  if (WUXING_KE[b] === a) return '被克';
  return '同';
}

/** 十神 —— 以日干为基准，判断另一天干 */
export function getShiShen(dayMaster: Tiangan, target: Tiangan): ShiShen {
  const sameYinYang = GAN_YINYANG[dayMaster] === GAN_YINYANG[target];
  switch (shengKe(GAN_WUXING[dayMaster], GAN_WUXING[target])) {
    case '同': return sameYinYang ? '比肩' : '劫财';
    case '生': return sameYinYang ? '食神' : '伤官';
    case '克': return sameYinYang ? '偏财' : '正财';
    case '被克': return sameYinYang ? '七杀' : '正官';
    case '被生': return sameYinYang ? '偏印' : '正印';
  }
}

/** 十神 → 五大类（比劫 / 食伤 / 财 / 官杀 / 印） */
export function shiShenGroup(ss: ShiShen): ShiShenGroup {
  switch (ss) {
    case '比肩': case '劫财': return '比劫';
    case '食神': case '伤官': return '食伤';
    case '偏财': case '正财': return '财';
    case '七杀': case '正官': return '官杀';
    default: return '印';
  }
}

/** 十神名 → 格局名（《子平真诠》八格体系 + 比劫两类） */
export const SHI_SHEN_TO_GE: Record<ShiShen, string> = {
  比肩: '比肩格', 劫财: '劫财格', 食神: '食神格', 伤官: '伤官格', 偏财: '偏财格',
  正财: '正财格', 七杀: '七杀格', 正官: '正官格', 偏印: '偏印格', 正印: '正印格',
};

/** 十二长生顺序 */
export const CHANG_SHENG_ORDER = [
  '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养',
] as const;
export type ChangSheng = typeof CHANG_SHENG_ORDER[number];

/** 长生位起点：阳干顺行、阴干逆行 */
const CHANG_SHENG_START: Record<Tiangan, Dizhi> = {
  甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申',
  乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯',
};

/** 天干在某地支的十二长生位（星运/地势） */
export function getChangSheng(gan: Tiangan, zhi: Dizhi): ChangSheng {
  const startIdx = DIZHI.indexOf(CHANG_SHENG_START[gan]);
  const zhiIdx = DIZHI.indexOf(zhi);
  const forward = GAN_YINYANG[gan] === '阳';
  const step = forward ? (zhiIdx - startIdx + 12) % 12 : (startIdx - zhiIdx + 12) % 12;
  return CHANG_SHENG_ORDER[step];
}

/** 天干五合配对 */
export const GAN_HE_PAIRS: Array<[Tiangan, Tiangan, WuXing]> = [
  ['甲', '己', '土'], ['乙', '庚', '金'], ['丙', '辛', '水'], ['丁', '壬', '木'], ['戊', '癸', '火'],
];

/** 天干五合：查对方 */
export const GAN_HE: Record<Tiangan, Tiangan> = {
  甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛',
  辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊',
};

/**
 * 调候用神 —— 《穷通宝鉴》十干十二月调候用神表（120 格）。
 * 每格 1–4 字，主用神在前。不同流派对个别月份有微调，本表取子平主流取用法。
 */
export const TIAO_HOU: Record<Tiangan, Record<Dizhi, string[]>> = {
  甲: {
    子: ['丁', '庚', '丙'], 丑: ['丁', '庚', '丙'], 寅: ['丙', '癸'],
    卯: ['庚', '丙', '丁', '戊', '己'], 辰: ['庚', '丁', '壬'], 巳: ['癸', '丁', '庚'],
    午: ['癸', '丁', '庚'], 未: ['癸', '丁', '庚'], 申: ['庚', '丁', '壬'],
    酉: ['庚', '丙', '丁'], 戌: ['庚', '甲', '壬', '癸'], 亥: ['庚', '丁', '戊', '丙'],
  },
  乙: {
    子: ['丙', '戊'], 丑: ['丙'], 寅: ['丙', '癸'],
    卯: ['丙', '癸'], 辰: ['癸', '丙', '戊'], 巳: ['癸'],
    午: ['癸', '丙'], 未: ['癸', '丙'], 申: ['丙', '癸', '己'],
    酉: ['癸', '丁', '丙'], 戌: ['癸', '辛'], 亥: ['丙', '戊'],
  },
  丙: {
    子: ['壬', '戊', '己'], 丑: ['壬', '甲'], 寅: ['壬', '庚'],
    卯: ['壬', '己'], 辰: ['壬', '甲'], 巳: ['壬', '庚', '癸'],
    午: ['壬', '庚'], 未: ['壬', '庚'], 申: ['壬', '戊'],
    酉: ['壬', '癸'], 戌: ['甲', '壬'], 亥: ['甲', '戊', '庚', '壬'],
  },
  丁: {
    子: ['甲', '庚'], 丑: ['甲', '庚'], 寅: ['庚', '壬'],
    卯: ['庚', '甲'], 辰: ['甲', '庚'], 巳: ['甲', '庚'],
    午: ['壬', '庚', '癸'], 未: ['甲', '壬', '庚'], 申: ['甲', '庚', '丙', '戊'],
    酉: ['甲', '庚', '丙', '戊'], 戌: ['甲', '庚', '戊'], 亥: ['甲', '庚'],
  },
  戊: {
    子: ['丙', '甲'], 丑: ['丙', '甲'], 寅: ['丙', '甲', '癸'],
    卯: ['丙', '甲', '癸'], 辰: ['甲', '丙', '癸'], 巳: ['甲', '丙', '癸'],
    午: ['壬', '甲', '丙'], 未: ['癸', '丙', '甲'], 申: ['丙', '癸', '甲'],
    酉: ['丙', '癸'], 戌: ['甲', '丙', '癸'], 亥: ['甲', '丙'],
  },
  己: {
    子: ['丙', '甲', '戊'], 丑: ['丙', '甲', '戊'], 寅: ['丙', '庚', '甲'],
    卯: ['甲', '癸', '丙'], 辰: ['丙', '癸', '甲'], 巳: ['癸', '丙'],
    午: ['癸', '丙'], 未: ['癸', '丙'], 申: ['丙', '癸'],
    酉: ['丙', '癸'], 戌: ['甲', '丙', '癸'], 亥: ['丙', '甲', '戊'],
  },
  庚: {
    子: ['丁', '甲', '丙'], 丑: ['丙', '丁', '甲'], 寅: ['丙', '甲', '壬'],
    卯: ['丁', '甲', '庚', '丙'], 辰: ['甲', '丁', '壬', '癸'], 巳: ['壬', '戊', '丙', '丁'],
    午: ['壬', '癸'], 未: ['丁', '甲'], 申: ['丁', '甲'],
    酉: ['丁', '甲', '丙'], 戌: ['甲', '壬'], 亥: ['丁', '丙'],
  },
  辛: {
    子: ['丙', '戊', '壬', '甲'], 丑: ['丙', '壬', '戊', '己'], 寅: ['己', '壬', '庚'],
    卯: ['壬', '甲'], 辰: ['壬', '甲'], 巳: ['壬', '甲', '癸'],
    午: ['壬', '己', '癸'], 未: ['壬', '庚', '甲'], 申: ['壬', '甲', '戊'],
    酉: ['壬', '甲'], 戌: ['壬', '甲'], 亥: ['壬', '丙'],
  },
  壬: {
    子: ['戊', '丙'], 丑: ['丙', '丁', '甲'], 寅: ['庚', '丙', '戊'],
    卯: ['戊', '辛', '庚'], 辰: ['甲', '庚'], 巳: ['壬', '辛', '庚', '癸'],
    午: ['癸', '庚', '辛'], 未: ['辛', '甲'], 申: ['戊', '丁'],
    酉: ['甲', '庚'], 戌: ['甲', '丙'], 亥: ['戊', '丙', '庚'],
  },
  癸: {
    子: ['丙', '辛'], 丑: ['丙', '丁'], 寅: ['辛', '丙'],
    卯: ['庚', '辛'], 辰: ['丙', '辛', '甲'], 巳: ['辛'],
    午: ['庚', '辛', '壬', '癸'], 未: ['庚', '辛', '壬', '癸'], 申: ['丁'],
    酉: ['辛', '丙'], 戌: ['辛', '甲', '壬', '癸'], 亥: ['庚', '辛', '戊', '丁'],
  },
};

export type WuXingMonthStatus = '旺' | '相' | '休' | '囚' | '死';

/** 五行随月令的旺相休囚死：当令者旺、令生者相、生令者休、克令者囚、令克者死 */
export function getWuXingMonthStatus(monthZhi: Dizhi): Record<WuXing, WuXingMonthStatus> {
  const monthWx = ZHI_WUXING[monthZhi];
  const result = {} as Record<WuXing, WuXingMonthStatus>;
  for (const wx of WUXING_LIST) {
    switch (shengKe(monthWx, wx)) {
      case '同': result[wx] = '旺'; break;
      case '生': result[wx] = '相'; break;
      case '被生': result[wx] = '休'; break;
      case '被克': result[wx] = '囚'; break;
      default: result[wx] = '死';
    }
  }
  return result;
}

/** 天干 → 五行十干代表字（用于五行转十神类） */
export const WUXING_REP_GAN: Record<WuXing, Tiangan> = { 木: '甲', 火: '丙', 土: '戊', 金: '庚', 水: '壬' };