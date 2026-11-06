/**
 * 八字排盘引擎 —— 由 BirthInfo 排出四柱八字盘（含五行、十神、藏干、纳音、旺衰、格局、调候、大运流年）。
 *
 * 与站内紫微排盘保持同一历法口径（lib/ziwei/algorithm.ts → getLunarInfo）：
 * · 年柱、月柱以**节气**换柱（立春换年、节令换月），不按农历正月初一
 * · 时刻取「时辰中点」：effHour = hour === 0 ? 0 : hour * 2
 *   hour=0 即早子时（00:00–00:59），晚子时（23:00–23:59）已由 lib/ziwei/share.ts 的
 *   formToBirthInfo() 归入次日，因此此处不再做晚子时换日，避免二次换日
 */

import { Solar } from 'lunar-javascript';
import type { BirthInfo } from '@/lib/ziwei/types';
import {
  GAN_WUXING, GAN_YINYANG, TIAO_HOU, ZHI_CANG_GAN, ZHI_WUXING, getChangSheng, getShiShen,
  type Dizhi, type Tiangan,
} from './tables';
import { PILLAR_KEYS, PILLAR_LABELS, countWuXing, detectGanRelations, detectZhiRelations, judgeGeJu, judgePillars, judgeWangShuai, type SiZhuGanZhi } from './analysis';
import type {
  BaziChart, BaziHideGan, BaziPillar, DaYunInfo, GanZhiItem, LiuNianInfo, PillarKey, XiaoYunInfo,
} from './types';

/** 时辰索引 (0-11) → 用于排盘的公历小时（取时辰中点，子时取 0 点） */
export function pillarHour(hour: number): number {
  return hour === 0 ? 0 : hour * 2;
}

function splitGanZhi(gz: string): { gan: Tiangan; zhi: Dizhi } {
  const cleaned = (gz || '').trim();
  return { gan: (cleaned[0] ?? '甲') as Tiangan, zhi: (cleaned[1] ?? '子') as Dizhi };
}

function toGanZhiItem(gz: string, naYin: string): GanZhiItem {
  const { gan, zhi } = splitGanZhi(gz);
  return { ganZhi: gz, gan, zhi, naYin };
}

/** 藏干（含分量与十神）——顺序与分量一律以本引擎对照表为准，保证确定性 */
function buildHideGan(zhi: Dizhi, dayMaster: Tiangan): BaziHideGan[] {
  return ZHI_CANG_GAN[zhi].map((entry) => ({
    gan: entry.gan,
    wuXing: GAN_WUXING[entry.gan],
    role: entry.role,
    shiShen: getShiShen(dayMaster, entry.gan),
  }));
}

export function calculateBazi(info: BirthInfo, nowYear: number = new Date().getFullYear()): BaziChart {
  const effHour = pillarHour(info.hour);
  const solar = Solar.fromYmdHms(info.year, info.month, info.day, effHour, 0, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const rawGanZhi: Record<PillarKey, string> = {
    year: ec.getYear(),
    month: ec.getMonth(),
    day: ec.getDay(),
    hour: ec.getTime(),
  };
  const rawNaYin: Record<PillarKey, string> = {
    year: ec.getYearNaYin(),
    month: ec.getMonthNaYin(),
    day: ec.getDayNaYin(),
    hour: ec.getTimeNaYin(),
  };
  const rawXun: Record<PillarKey, string> = {
    year: ec.getYearXun(),
    month: ec.getMonthXun(),
    day: ec.getDayXun(),
    hour: ec.getTimeXun(),
  };
  const rawXunKong: Record<PillarKey, string> = {
    year: ec.getYearXunKong(),
    month: ec.getMonthXunKong(),
    day: ec.getDayXunKong(),
    hour: ec.getTimeXunKong(),
  };

  const dayMaster = splitGanZhi(rawGanZhi.day).gan;

  const pillars = {} as Record<PillarKey, BaziPillar>;
  for (const key of PILLAR_KEYS) {
    const { gan, zhi } = splitGanZhi(rawGanZhi[key]);
    const isDayMaster = key === 'day';
    const hideGan = buildHideGan(zhi, dayMaster);
    pillars[key] = {
      key,
      label: `${PILLAR_LABELS[key]}柱`,
      gan,
      zhi,
      ganZhi: rawGanZhi[key],
      ganWuXing: GAN_WUXING[gan],
      zhiWuXing: ZHI_WUXING[zhi],
      ganYinYang: GAN_YINYANG[gan],
      ganShiShen: isDayMaster ? '日主' : getShiShen(dayMaster, gan),
      hideGan,
      benQiShiShen: getShiShen(dayMaster, ZHI_CANG_GAN[zhi][0].gan),
      naYin: rawNaYin[key],
      diShi: getChangSheng(dayMaster, zhi),
      xun: rawXun[key],
      xunKong: rawXunKong[key],
      isDayMaster,
    };
  }

  const siZhu: SiZhuGanZhi = {
    year: { gan: pillars.year.gan, zhi: pillars.year.zhi },
    month: { gan: pillars.month.gan, zhi: pillars.month.zhi },
    day: { gan: pillars.day.gan, zhi: pillars.day.zhi },
    hour: { gan: pillars.hour.gan, zhi: pillars.hour.zhi },
  };

  const wuXing = countWuXing(siZhu, dayMaster);
  const wangShuai = judgeWangShuai(siZhu);
  const geJu = judgeGeJu(siZhu);

  const monthZhi = pillars.month.zhi;
  const tiaoHouList = TIAO_HOU[dayMaster][monthZhi];
  const tiaoHou = {
    yongShen: tiaoHouList,
    primary: tiaoHouList[0] ?? '',
    note: `《穷通宝鉴》${dayMaster}日${monthZhi}月调候用神：${tiaoHouList.join('、')}（主用神在前；各家流派对个别月份有微调）`,
  };

  const yunRaw = ec.getYun(info.gender === 'male' ? 1 : 0);
  const daYunArr = yunRaw.getDaYun();
  const daYun: DaYunInfo[] = daYunArr.map((dy) => {
    const gz = dy.getGanZhi();
    const hasGz = !!gz;
    const split = hasGz ? splitGanZhi(gz) : { gan: null, zhi: null };
    const startYear = dy.getStartYear();
    const endYear = dy.getEndYear();
    const liuNian: LiuNianInfo[] = dy.getLiuNian().map((ln) => {
      const lgz = ln.getGanZhi();
      const { gan, zhi } = splitGanZhi(lgz);
      return {
        year: ln.getYear(),
        age: ln.getAge(),
        ganZhi: lgz,
        gan,
        zhi,
        ganShiShen: getShiShen(dayMaster, gan),
      };
    });
    return {
      index: dy.getIndex(),
      ganZhi: gz,
      gan: split.gan,
      zhi: split.zhi,
      ganShiShen: split.gan ? getShiShen(dayMaster, split.gan) : null,
      startAge: dy.getStartAge(),
      endAge: dy.getEndAge(),
      startYear,
      endYear,
      isCurrent: startYear <= nowYear && nowYear <= endYear,
      liuNian,
    };
  });

  const yun = {
    forward: yunRaw.isForward(),
    startYear: yunRaw.getStartYear(),
    startMonth: yunRaw.getStartMonth(),
    startDay: yunRaw.getStartDay(),
    startText: `${yunRaw.getStartYear()}年${yunRaw.getStartMonth()}月${yunRaw.getStartDay()}日起运`,
    startSolar: yunRaw.getStartSolar().toYmd(),
    daYun,
  };

  const preYunRaw = daYunArr[0]?.getXiaoYun?.() ?? [];
  const xiaoYun: XiaoYunInfo[] = preYunRaw.map((xy) => {
    const gz = xy.getGanZhi();
    const { gan } = splitGanZhi(gz);
    return { year: xy.getYear(), age: xy.getAge(), ganZhi: gz, ganShiShen: gan ? getShiShen(dayMaster, gan) : null };
  });

  const prevJq = lunar.getPrevJieQi();
  const nextJq = lunar.getNextJieQi();
  const jieQi = {
    prevName: prevJq?.getName(),
    prevTime: prevJq?.getSolar()?.toYmdHms(),
    nextName: nextJq?.getName(),
    nextTime: nextJq?.getSolar()?.toYmdHms(),
  };

  const lunarMonth = lunar.getMonth();
  const currentAge = nowYear - info.year + 1;
  const currentDaYun = daYun.find((d) => d.isCurrent && d.ganZhi);
  const currentLiuNian = currentDaYun?.liuNian.find((ln) => ln.year === nowYear);

  return {
    birthInfo: info,
    solar: { year: info.year, month: info.month, day: info.day, hour: effHour, minute: 0 },
    lunar: {
      year: lunar.getYear(),
      month: Math.abs(lunarMonth),
      day: lunar.getDay(),
      isLeap: lunarMonth < 0,
      text: lunar.toString(),
    },
    pillars,
    dayMaster: { gan: dayMaster, wuXing: GAN_WUXING[dayMaster], yinYang: GAN_YINYANG[dayMaster] },
    wuXing,
    wangShuai,
    geJu,
    tiaoHou,
    ganRelations: detectGanRelations(siZhu),
    zhiRelations: detectZhiRelations(siZhu),
    pillarVerdicts: judgePillars(siZhu),
    aux: {
      taiYuan: toGanZhiItem(ec.getTaiYuan(), ec.getTaiYuanNaYin()),
      taiXi: toGanZhiItem(ec.getTaiXi(), ec.getTaiXiNaYin()),
      mingGong: toGanZhiItem(ec.getMingGong(), ec.getMingGongNaYin()),
      shenGong: toGanZhiItem(ec.getShenGong(), ec.getShenGongNaYin()),
    },
    jieQi,
    yun,
    xiaoYun,
    currentYear: nowYear,
    currentAge,
    currentDaYunIndex: currentDaYun?.index,
    currentLiuNian,
  };
}