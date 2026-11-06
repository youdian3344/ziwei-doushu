/**
 * 八字盘 → 提示词文本 —— 把排盘结果整理成结构化的纯文本，供 AI 解读使用。
 * 只客观陈述排盘事实（干支、十神、藏干、旺衰、格局、调候、大运流年），不含任何吉凶结论。
 */

import { PILLAR_KEYS } from './analysis';
import type { BaziChart, DaYunInfo, LiuNianInfo } from './types';

const GENDER_TEXT: Record<string, string> = { male: '男', female: '女' };

function pillarLine(chart: BaziChart, key: typeof PILLAR_KEYS[number]): string {
  const p = chart.pillars[key];
  const hide = p.hideGan.map((h) => `${h.gan}(${h.shiShen}·${h.role})`).join('、');
  return [
    `${p.label}：${p.ganZhi}`,
    `天干${p.gan}${p.ganWuXing}，十神${p.ganShiShen}`,
    `地支${p.zhi}${p.zhiWuXing}，藏干${hide}`,
    `纳音${p.naYin}，星运${p.diShi}`,
    `旬${p.xun}空亡${p.xunKong}`,
  ].join('；');
}

function daYunLine(dy: DaYunInfo, years: number[]): string {
  const gz = dy.ganZhi || '（起运前）';
  const head = `${dy.startAge}-${dy.endAge}岁 ${gz}（${dy.startYear}-${dy.endYear}）${dy.ganShiShen ? ` 十神${dy.ganShiShen}` : ''}`;
  const ln = dy.liuNian
    .filter((l) => years.includes(l.year))
    .map((l: LiuNianInfo) => `${l.year}年${l.ganZhi}(${l.age}岁/${l.ganShiShen})`)
    .join('、');
  return ln ? `${head}；流年：${ln}` : head;
}

/** 把八字盘整理为可直接嵌入系统提示词的结构化文本 */
export function baziToText(chart: BaziChart): string {
  const { pillars, birthInfo } = chart;
  const lines: string[] = [];

  lines.push('【基本信息】');
  lines.push(
    `性别：${GENDER_TEXT[birthInfo.gender] ?? '未填'}`
    + `${birthInfo.name ? `；姓名：${birthInfo.name}` : ''}`
    + `${birthInfo.province ? `；出生地：${birthInfo.province}${birthInfo.city ?? ''}` : ''}`,
  );
  lines.push(
    `公历（排盘用）：${chart.solar.year}-${String(chart.solar.month).padStart(2, '0')}-${String(chart.solar.day).padStart(2, '0')} `
    + `${String(chart.solar.hour).padStart(2, '0')}:00（取时辰中点；晚子时已归入次日）`,
  );
  lines.push(`农历：${chart.lunar.text}${chart.lunar.isLeap ? '（闰月）' : ''}`);
  if (chart.jieQi.prevName) {
    lines.push(`节气：上一节气 ${chart.jieQi.prevName} ${chart.jieQi.prevTime ?? ''}；下一节气 ${chart.jieQi.nextName ?? ''} ${chart.jieQi.nextTime ?? ''}`);
  }

  lines.push('');
  lines.push('【四柱八字】');
  lines.push(`八字：${pillars.year.ganZhi} ${pillars.month.ganZhi} ${pillars.day.ganZhi} ${pillars.hour.ganZhi}`);
  lines.push(`日主：${chart.dayMaster.gan}（${chart.dayMaster.yinYang}${chart.dayMaster.wuXing}）`);
  for (const key of PILLAR_KEYS) lines.push(pillarLine(chart, key));

  lines.push('');
  lines.push('【五行统计】');
  lines.push(`天干地支字面五行：${Object.entries(chart.wuXing.surface).map(([k, v]) => `${k}${v}`).join(' ')}`);
  lines.push(`计入藏干加权（本气1、中气0.5、余气0.3）：${Object.entries(chart.wuXing.withCangGan).map(([k, v]) => `${k}${v}`).join(' ')}`);
  lines.push(`缺失五行：${chart.wuXing.missing.length ? chart.wuXing.missing.join('、') : '无'}`);
  lines.push(`月令旺相休囚死：${Object.entries(chart.wuXing.monthStatus).map(([k, v]) => `${k}${v}`).join(' ')}`);
  lines.push(`五行对应十神大类：${Object.entries(chart.wuXing.shiShenGroups).map(([k, v]) => `${k}=${v}`).join('、')}`);

  lines.push('');
  lines.push('【旺衰（量化口径：得令 + 长生 + 得地 + 得势）】');
  const ws = chart.wangShuai;
  lines.push(`结论：${ws.verdict}（综合分 ${ws.score}，置信度 ${ws.confidence}）`);
  lines.push(`得令 ${ws.breakdown.deLing}；长生 ${ws.breakdown.changSheng}；得地 ${ws.breakdown.deDi}；得势 ${ws.breakdown.deShi}`);

  lines.push('');
  lines.push('【格局（《子平真诠》以月令为纲）】');
  lines.push(`主格：${chart.geJu.primary}（置信度 ${chart.geJu.confidence}）`);
  lines.push(`立格依据：${chart.geJu.basis}`);
  if (chart.geJu.touGan.length) lines.push(`月令藏干透干：${chart.geJu.touGan.join('、')}`);
  for (const note of chart.geJu.notes) lines.push(`备注：${note}`);

  lines.push('');
  lines.push('【调候用神】');
  lines.push(chart.tiaoHou.note);

  lines.push('');
  lines.push('【干支关系】');
  const ganRel = chart.ganRelations.map((r) => `${r.type} ${r.gans.join('')}（${r.pillars.join('')}）`);
  const zhiRel = chart.zhiRelations.map((r) => `${r.type} ${r.zhi.join('')}（${r.pillars.join('')}${r.detail ? `·${r.detail}` : ''}）`);
  lines.push(`天干：${ganRel.length ? ganRel.join('；') : '无合无克'}`);
  lines.push(`地支：${zhiRel.length ? zhiRel.join('；') : '无冲无合无刑无害'}`);
  lines.push(`整柱：${chart.pillarVerdicts.map((v) => `${v.pillar}${v.verdict}`).join('、')}`);

  lines.push('');
  lines.push('【胎元命宫】');
  lines.push(
    `胎元 ${chart.aux.taiYuan.ganZhi}（${chart.aux.taiYuan.naYin}）、`
    + `胎息 ${chart.aux.taiXi.ganZhi}（${chart.aux.taiXi.naYin}）、`
    + `命宫 ${chart.aux.mingGong.ganZhi}（${chart.aux.mingGong.naYin}）、`
    + `身宫 ${chart.aux.shenGong.ganZhi}（${chart.aux.shenGong.naYin}）`,
  );

  lines.push('');
  lines.push('【起运与大运】');
  lines.push(`${chart.yun.forward ? '顺行' : '逆行'}，${chart.yun.startText}（公历 ${chart.yun.startSolar}）`);
  const nowY = chart.currentYear;
  const window = Array.from({ length: 10 }, (_, i) => nowY - 2 + i);
  for (const dy of chart.yun.daYun) {
    if (!dy.ganZhi) continue;
    lines.push(daYunLine(dy, window));
  }
  lines.push(
    `当前：${nowY} 年（虚岁 ${chart.currentAge}）`
    + `${chart.currentDaYunIndex !== undefined ? `，行第 ${chart.currentDaYunIndex} 步大运` : ''}`
    + `${chart.currentLiuNian ? `，流年 ${chart.currentLiuNian.ganZhi}（十神 ${chart.currentLiuNian.ganShiShen}）` : ''}`,
  );

  return lines.join('\n');
}