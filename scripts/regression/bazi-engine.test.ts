/**
 * 八字排盘引擎 lib/bazi — 回归测试
 *
 * 锁住以下口径（与站内紫微排盘同一历法口径）：
 * ① 年柱/月柱以节气换柱（立春换年、节令换月），不按农历正月初一
 * ② 时刻取时辰中点 effHour = hour === 0 ? 0 : hour * 2；晚子时由 formToBirthInfo 归入次日，此处不二次换日
 * ③ 四柱、藏干、十神、纳音、星运、旬空、五行统计、旺衰、格局、调候、干支关系、整柱、胎元命宫、起运大运流年
 *
 * 期望值来源：1990-06-15 / 1992-03-08 / 1988-02-15 等日期的四柱交由 lunar-javascript 的 getEightChar()（精确到
 * 节气时刻）产出，并用《万年历》干支人工核对；立春边界沿用 sizhu-lichun-boundary.test.ts 的会员案例（2004-02-04 立春 19:56）。
 */
import assert from 'node:assert/strict';
import { calculateBazi } from '../../lib/bazi';
import { GAN_WUXING, ZHI_CANG_GAN, getShiShen } from '../../lib/bazi/tables';
import { formToBirthInfo } from '../../lib/ziwei/share';
import type { BirthInfo } from '../../lib/ziwei/types';

/** 与 BirthFormState 结构一致（此处按 formToBirthInfo 形参推导，避免测试脚本依赖组件路径别名） */
type FormLike = Parameters<typeof formToBirthInfo>[0];

let passed = 0;
const ok = (name: string, cond: boolean) => {
  assert.ok(cond, `❌ ${name}`);
  console.log(`  ✅ ${name}`);
  passed++;
};
const sizhuStr = (c: ReturnType<typeof calculateBazi>) =>
  (['year', 'month', 'day', 'hour'] as const).map((k) => c.pillars[k].ganZhi).join(' ');

// ── 基准盘 A：1990-06-15 午时 男（庚午 壬午 辛亥 甲午） ──────────────────────────
const A: BirthInfo = { year: 1990, month: 6, day: 15, hour: 6, gender: 'male' };
const a = calculateBazi(A, 2026);

ok('A 四柱 = 庚午 壬午 辛亥 甲午', sizhuStr(a) === '庚午 壬午 辛亥 甲午');
ok('A 日主 = 辛（阴金）', a.dayMaster.gan === '辛' && a.dayMaster.wuXing === '金' && a.dayMaster.yinYang === '阴');
ok('A 农历一九九〇年五月廿三', a.lunar.year === 1990 && a.lunar.month === 5 && a.lunar.day === 23 && !a.lunar.isLeap);
ok('A 排盘用公历取时辰中点 12:00', a.solar.hour === 12 && a.solar.minute === 0);

// 十神（年干庚=劫财、月干壬=伤官、时干甲=正财、日干标日主）
ok('A 年干十神劫财', a.pillars.year.ganShiShen === '劫财' && a.pillars.year.ganWuXing === '金');
ok('A 月干十神伤官', a.pillars.month.ganShiShen === '伤官' && a.pillars.month.ganWuXing === '水');
ok('A 时干十神正财', a.pillars.hour.ganShiShen === '正财' && a.pillars.hour.ganWuXing === '木');
ok('A 日柱标日主', a.pillars.day.isDayMaster === true && a.pillars.day.ganShiShen === '日主');
ok('A 月支本气十神七杀', a.pillars.month.benQiShiShen === '七杀');

// 藏干：与 ZHI_CANG_GAN 对照表逐项一致，且十神由日主推出
const cangOk = (['year', 'month', 'day', 'hour'] as const).every((k) => {
  const p = a.pillars[k];
  const table = ZHI_CANG_GAN[p.zhi];
  return p.hideGan.length === table.length
    && p.hideGan.every((h, i) =>
      h.gan === table[i].gan
      && h.role === table[i].role
      && h.wuXing === GAN_WUXING[table[i].gan]
      && h.shiShen === getShiShen(a.dayMaster.gan, table[i].gan));
});
ok('A 四柱藏干（含分量与十神）与对照表一致', cangOk);
ok('A 月支午藏干 = 丁(七杀·本气) / 己(偏印·中气)',
  a.pillars.month.hideGan.map((h) => `${h.gan}${h.shiShen}${h.role}`).join(',') === '丁七杀benqi,己偏印zhongqi');

// 纳音 / 星运 / 旬空
ok('A 纳音 = 路旁土 杨柳木 钗钏金 沙中金',
  (['year', 'month', 'day', 'hour'] as const).map((k) => a.pillars[k].naYin).join(' ') === '路旁土 杨柳木 钗钏金 沙中金');
ok('A 星运（日主辛在各支）= 病 病 沐浴 病',
  (['year', 'month', 'day', 'hour'] as const).map((k) => a.pillars[k].diShi).join(' ') === '病 病 沐浴 病');
ok('A 日柱旬空 = 寅卯', a.pillars.day.xunKong === '寅卯' && a.pillars.day.xun === '甲辰');

// 五行统计（字面 / 含藏干加权）
ok('A 字面五行 = 木1 火3 土0 金2 水2',
  a.wuXing.surface['木'] === 1 && a.wuXing.surface['火'] === 3 && a.wuXing.surface['土'] === 0
  && a.wuXing.surface['金'] === 2 && a.wuXing.surface['水'] === 2);
ok('A 字面五行合计 = 8（四干四支）',
  Object.values(a.wuXing.surface).reduce((x, y) => x + y, 0) === 8);
ok('A 缺失五行 = 土', a.wuXing.missing.join('') === '土');
ok('A 含藏干加权 = 木1.5 火3 土1.5 金2 水2',
  a.wuXing.withCangGan['木'] === 1.5 && a.wuXing.withCangGan['土'] === 1.5 && a.wuXing.withCangGan['火'] === 3);
ok('A 月令旺相休囚死（午月）= 火旺 金死 木休 水囚 土相',
  a.wuXing.monthStatus['火'] === '旺' && a.wuXing.monthStatus['金'] === '死'
  && a.wuXing.monthStatus['木'] === '休' && a.wuXing.monthStatus['水'] === '囚' && a.wuXing.monthStatus['土'] === '相');
ok('A 五行对应十神大类 = 木财 火官杀 土印 金比劫 水食伤',
  a.wuXing.shiShenGroups['木'] === '财' && a.wuXing.shiShenGroups['火'] === '官杀'
  && a.wuXing.shiShenGroups['土'] === '印' && a.wuXing.shiShenGroups['金'] === '比劫'
  && a.wuXing.shiShenGroups['水'] === '食伤');

// 旺衰
ok('A 旺衰 = 偏弱（-3.8）', a.wangShuai.verdict === '偏弱' && a.wangShuai.score === -3.8);
ok('A 旺衰分项 = 得令-3.3 长生-1 得地1 得势-0.5',
  a.wangShuai.breakdown.deLing === -3.3 && a.wangShuai.breakdown.changSheng === -1
  && a.wangShuai.breakdown.deDi === 1 && a.wangShuai.breakdown.deShi === -0.5);
ok('A 旺衰分项合计 = 综合分', a.wangShuai.breakdown.details.length > 0
  && Math.abs((a.wangShuai.breakdown.deLing + a.wangShuai.breakdown.changSheng
    + a.wangShuai.breakdown.deDi + a.wangShuai.breakdown.deShi) - a.wangShuai.score) < 1e-9);

// 格局 / 调候
ok('A 格局 = 七杀格（纯气月支午，本气丁七杀）',
  a.geJu.primary === '七杀格' && a.geJu.confidence === '高' && a.geJu.basis.includes('纯气月支'));
ok('A 调候用神 = 壬 己 癸（《穷通宝鉴》辛日午月）',
  a.tiaoHou.yongShen.join('') === '壬己癸' && a.tiaoHou.primary === '壬');

// 干支关系与整柱
ok('A 天干关系含 庚甲相克（年时）与 辛甲相克（日时）',
  a.ganRelations.filter((r) => r.type === '天干相克').length === 2);
ok('A 地支关系含 午午自刑 与 午亥暗合（丁壬、己甲）',
  a.zhiRelations.some((r) => r.type === '自刑' && r.zhi.join('') === '午午')
  && a.zhiRelations.some((r) => r.type === '暗合' && r.zhi.join('') === '午亥'));
ok('A 整柱盖头截脚 = 截脚 盖头 天干生地支 天干生地支',
  a.pillarVerdicts.map((p) => p.verdict).join(' ') === '截脚 盖头 天干生地支 天干生地支');

// 胎元 / 胎息 / 命宫 / 身宫
ok('A 胎元癸酉(剑锋金) 胎息丙寅(炉中火) 命宫辛巳(白蜡金) 身宫己丑(霹雳火)',
  a.aux.taiYuan.ganZhi === '癸酉' && a.aux.taiYuan.naYin === '剑锋金'
  && a.aux.taiXi.ganZhi === '丙寅' && a.aux.taiXi.naYin === '炉中火'
  && a.aux.mingGong.ganZhi === '辛巳' && a.aux.mingGong.naYin === '白蜡金'
  && a.aux.shenGong.ganZhi === '己丑' && a.aux.shenGong.naYin === '霹雳火');

// 节气
ok('A 前后节气 = 芒种 / 夏至',
  a.jieQi.prevName === '芒种' && a.jieQi.prevTime?.startsWith('1990-06-06') === true
  && a.jieQi.nextName === '夏至' && a.jieQi.nextTime?.startsWith('1990-06-21') === true);

// 起运 / 大运 / 流年
ok('A 阳年男命顺行，7年5月0日起运（1997-11-15）',
  a.yun.forward === true && a.yun.startText === '7年5月0日起运' && a.yun.startSolar === '1997-11-15');
ok('A 大运首段为起运前（无干支，1990-1996，虚岁1-7）',
  a.yun.daYun[0].ganZhi === '' && a.yun.daYun[0].gan === null
  && a.yun.daYun[0].startYear === 1990 && a.yun.daYun[0].endYear === 1996
  && a.yun.daYun[0].startAge === 1 && a.yun.daYun[0].endAge === 7);
ok('A 大运 8-17 癸未 / 18-27 甲申 / 28-37 乙酉 / 38-47 丙戌',
  a.yun.daYun.slice(1, 5).map((d) => `${d.startAge}-${d.endAge}${d.ganZhi}`).join(' ')
  === '8-17癸未 18-27甲申 28-37乙酉 38-47丙戌');
ok('A 大运干支十神正确（癸未干癸=食神）', a.yun.daYun[1].ganShiShen === '食神');
ok('A 起运前小运 7 条（1990 乙未 偏财起）',
  a.xiaoYun.length === 7 && a.xiaoYun[0].year === 1990 && a.xiaoYun[0].ganZhi === '乙未'
  && a.xiaoYun[0].ganShiShen === '偏财');
ok('A 2026 年：虚岁37、当前大运乙酉（28-37）、流年丙午',
  a.currentYear === 2026 && a.currentAge === 37
  && a.currentDaYunIndex === 3 && a.yun.daYun[3].ganZhi === '乙酉'
  && a.currentLiuNian?.ganZhi === '丙午' && a.currentLiuNian?.year === 2026
  && a.currentLiuNian?.ganShiShen === '正官');
ok('A 当前大运段标 isCurrent', a.yun.daYun[3].isCurrent === true
  && a.yun.daYun.filter((d) => d.isCurrent).length === 1);

// ── 基准盘 B：1992-03-08 未时 女（壬申 癸卯 癸未 己未，逆行） ────────────────────
const b = calculateBazi({ year: 1992, month: 3, day: 8, hour: 7, gender: 'female' }, 2026);
ok('B 四柱 = 壬申 癸卯 癸未 己未', sizhuStr(b) === '壬申 癸卯 癸未 己未');
ok('B 日主癸水', b.dayMaster.gan === '癸' && b.dayMaster.wuXing === '水' && b.dayMaster.yinYang === '阴');
ok('B 阳年女命逆行，0年11月20日起运（1993-02-28）',
  b.yun.forward === false && b.yun.startText === '0年11月20日起运' && b.yun.startSolar === '1993-02-28');
ok('B 大运 2-11 壬寅 / 12-21 辛丑 / 22-31 庚子',
  b.yun.daYun.slice(1, 4).map((d) => `${d.startAge}-${d.endAge}${d.ganZhi}`).join(' ') === '2-11壬寅 12-21辛丑 22-31庚子');
ok('B 格局 = 食神格（月支卯本气乙食神，纯气月支）', b.geJu.primary === '食神格' && b.geJu.confidence === '高');
ok('B 调候用神（癸日卯月）= 庚 辛', b.tiaoHou.yongShen.join('') === '庚辛');

// ── 基准盘 F：1988-02-15 卯时 女（戊辰 甲寅 庚子 己卯） ────────────────────────
const f = calculateBazi({ year: 1988, month: 2, day: 15, hour: 3, gender: 'female' }, 2026);
ok('F 四柱 = 戊辰 甲寅 庚子 己卯', sizhuStr(f) === '戊辰 甲寅 庚子 己卯');
ok('F 月支寅非纯气月支，本气甲透月干 → 偏财格', f.geJu.primary === '偏财格' && f.geJu.basis.includes('透干'));

// ── 立春边界（会员案例：2004-02-04 立春 19:56:13） ────────────────────────────
const cSpring = calculateBazi({ year: 2004, month: 2, day: 4, hour: 1, gender: 'male' }, 2026);   // effHour 02:00 立春前
const dSpring = calculateBazi({ year: 2004, month: 2, day: 4, hour: 10, gender: 'male' }, 2026); // effHour 20:00 立春后
ok('立春前（丑时 02:00）= 癸未 乙丑 癸丑 癸丑', sizhuStr(cSpring) === '癸未 乙丑 癸丑 癸丑');
ok('立春后（亥时 20:00）= 甲申 丙寅 癸丑 壬戌', sizhuStr(dSpring) === '甲申 丙寅 癸丑 壬戌');
ok('同日不同时辰只在立春时刻两侧分档：年柱 癸未→甲申、月柱 乙丑→丙寅',
  cSpring.pillars.year.ganZhi !== dSpring.pillars.year.ganZhi
  && cSpring.pillars.month.ganZhi !== dSpring.pillars.month.ganZhi);
ok('日柱不受立春影响（同日同为癸丑）',
  cSpring.pillars.day.ganZhi === '癸丑' && dSpring.pillars.day.ganZhi === '癸丑');
ok('立春前的那一例，下一节气即立春 2004-02-04 19:56:13',
  cSpring.jieQi.nextName === '立春' && cSpring.jieQi.nextTime === '2004-02-04 19:56:13');

// ── 子时与晚子时换日 ──────────────────────────────────────────────────────────
const formBase = {
  year: '1990', month: '6', day: '15', unknownTime: false,
  clockHour: '23', clockMinute: '30', gender: 'male' as const,
  longitude: 120, province: '浙江省', city: '杭州',
} as unknown as FormLike;
const lateInfo = formToBirthInfo(formBase);
ok('晚子时 23:30 归入次日（1990-06-16）且时支为子时',
  lateInfo.year === 1990 && lateInfo.month === 6 && lateInfo.day === 16 && lateInfo.hour === 0);
const lateChart = calculateBazi(lateInfo, 2026);
const earlyChart = calculateBazi(
  formToBirthInfo({ ...formBase, day: '16', clockHour: '00', clockMinute: '30' } as unknown as FormLike),
  2026,
);
ok('晚子时 23:30 与次日 00:30 排出同一张盘（庚午 壬午 壬子 庚子）',
  sizhuStr(lateChart) === sizhuStr(earlyChart) && sizhuStr(lateChart) === '庚午 壬午 壬子 庚子');
ok('日柱随换日变化（壬子，非辛亥），时柱庚子',
  lateChart.pillars.day.ganZhi === '壬子' && lateChart.pillars.hour.ganZhi === '庚子');
ok('早子时（hour=0）取 0 点，不二次换日（1990-06-15 早子时仍为辛亥日，时柱戊子）',
  sizhuStr(calculateBazi({ year: 1990, month: 6, day: 15, hour: 0, gender: 'male' }, 2026))
  === '庚午 壬午 辛亥 戊子');

// ── 确定性 ────────────────────────────────────────────────────────────────────
ok('同一输入重复计算两次结果完全一致', JSON.stringify(calculateBazi(A, 2026)) === JSON.stringify(calculateBazi(A, 2026)));

console.log(`\n[bazi-engine] ${passed} 项断言全部通过`);