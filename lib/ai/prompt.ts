/**
 * lib/ai/prompt —— 把命盘数据转成模型可读的文本，并组装解读指令
 *
 * 命盘数据完全来自本站排盘引擎的输出（ZiweiChart），不做二次推算，
 * 以免模型拿到与本仓库算法不一致的结论依据。
 */

import { BRANCHES, STEMS, SHICHEN } from '@/lib/ziwei/constants';
import {
  HEMING_METHODOLOGY,
  STAR_IN_FUQI_GU,
} from '@/lib/ziwei/heming-knowledge';
import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import type { BaziChart } from '@/lib/bazi/types';
import { baziToText } from '@/lib/bazi/text';
import { BAZI_METHODOLOGY, BAZI_QUOTE_RULE } from './bazi-knowledge';

const STAR_GROUPS: Array<[string, Star['type']]> = [
  ['主星', 'major'],
  ['辅星', 'minor'],
  ['吉星', 'lucky'],
  ['煞星', 'sha'],
];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function shichenName(hour: number): string {
  return SHICHEN.find((s) => s.branch === hour)?.name ?? `第${hour + 1}个时辰`;
}

function starText(star: Star): string {
  const parts = [star.name];
  if (star.brightnessRaw) parts.push(star.brightnessRaw);
  if (star.siHua) parts.push(`化${star.siHua}`);
  return parts.join('');
}

function palaceText(palace: Palace): string {
  const tags: string[] = [];
  if (palace.isMingGong) tags.push('命宫');
  if (palace.isShenGong) tags.push('身宫');
  if (palace.isCurrentDaXian) tags.push('当前大限');

  const segments: string[] = [];
  for (const [label, type] of STAR_GROUPS) {
    const stars = palace.stars.filter((s) => s.type === type);
    if (stars.length) segments.push(`${label}：${stars.map(starText).join('、')}`);
  }
  if (palace.isEmpty) {
    const borrowed = palace.borrowedStars?.length ? `（借${palace.borrowedStars.join('、')}）` : '';
    segments.push(`空宫${borrowed}`);
  }
  if (palace.selfSihua?.length) {
    segments.push(`宫干自化：${palace.selfSihua.map((m) => `${m.starName}自化${m.siHua}`).join('、')}`);
  }

  const daxian = palace.daXianAge ? `[大限 ${palace.daXianAge[0]}-${palace.daXianAge[1]} 岁]` : '';
  const head = `${palace.name}（${STEMS[palace.stem] ?? '?'}${BRANCHES[palace.branch] ?? '?'}）`
    + `${tags.length ? `[${tags.join('·')}]` : ''}${daxian}`;

  return segments.length ? `${head}：${segments.join('；')}` : head;
}

/** 命盘 → 结构化文本（模型解读的唯一数据来源） */
export function chartToText(chart: ZiweiChart, label?: string): string {
  const birth = chart.birthInfo;
  const lunar = chart.lunarInfo;
  const lines: string[] = [];

  if (label) lines.push(`【${label}】`);

  const birthplace = [birth.province, birth.city].filter(Boolean).join('');
  lines.push(
    `基本信息：${birth.name ? `姓名${birth.name}，` : ''}${birth.gender === 'male' ? '男' : '女'}命，`
    + `公历 ${birth.year}-${pad2(birth.month)}-${pad2(birth.day)} ${shichenName(birth.hour)}`
    + `${birthplace ? `，出生地${birthplace}` : ''}`,
  );
  lines.push(
    `农历与四柱：${lunar.lunarYear}年${lunar.isLeapMonth ? '闰' : ''}${Math.abs(lunar.lunarMonth)}月${lunar.lunarDay}日，`
    + `年干支${STEMS[lunar.yearStem] ?? '?'}${BRANCHES[lunar.yearBranch] ?? '?'}`
    + `${lunar.fourPillars?.length ? `，四柱 ${lunar.fourPillars.join(' ')}` : ''}`,
  );
  lines.push(
    `格局定位：${chart.wuxingJuName}，命宫在${BRANCHES[chart.mingGongBranch] ?? '?'}，`
    + `身宫在${BRANCHES[chart.shenGongBranch] ?? '?'}，命主${chart.mingZhu ?? '未知'}，`
    + `身主${chart.shenZhu ?? '未知'}${chart.yinYangGender ? `，${chart.yinYangGender}` : ''}，`
    + `当前虚岁 ${chart.currentAge}`,
  );

  const current = chart.daXians[chart.currentDaXianIndex];
  if (current) {
    lines.push(
      `当前大限：${current.startAge}-${current.endAge} 岁，大限宫${current.palaceName}`
      + `${current.stemName ? `（${current.stemName}）` : ''}`
      + `${current.siHua ? `，大限四化 禄${current.siHua.lu} 权${current.siHua.quan} 科${current.siHua.ke} 忌${current.siHua.ji}` : ''}`,
    );
  }

  lines.push('十二宫：');
  lines.push(
    ...chart.palaces
      .slice()
      .sort((a, b) => a.branch - b.branch)
      .map(palaceText),
  );

  lines.push(
    `大限序列：${chart.daXians
      .map((d) => `${d.startAge}-${d.endAge}(${d.palaceName})`)
      .join('、')}`,
  );

  return lines.join('\n');
}

const HOUSE_RULES = `【解读纪律】
1. 所有结论必须能在上述命盘数据中找到依据，禁止臆造未出现的星曜、宫位、四化或格局。
2. 若提问中指定了输出结构（如【主星解读】【三方四正联动】【实际建议】等），严格按其结构分段作答，不增删段落。
3. 论及三方四正、宫干自化、大限/流年四化时，要点明所依据的宫位与星曜。
4. 语言为简体中文；命理专有名词若需英文表述，采用「拼音 + 英文注释」，不做意译。
5. 语气专业克制；健康、财务、法律相关只给建议性表述，不做确定性指令或承诺。
6. 不使用 Markdown 表格与代码块，用小标题和短段落排版。`;

/** 命盘解读的系统提示词 */
export function buildInterpretSystemPrompt(chart: ZiweiChart): string {
  return `你是紫微斗数命理师，严格依据倪海厦《天纪》体系的论命方法为用户解读命盘。
解读必须落在具体宫位、星曜、四化与格局上，说清「依据—结论—建议」的链条。

【命盘数据】
${chartToText(chart)}

${HOUSE_RULES}`;
}

/** 合盘分析的系统提示词 */
export function buildHemingSystemPrompt(chartA: ZiweiChart, chartB: ZiweiChart): string {
  const sourceA = chartA.birthInfo.name || '甲方';
  const sourceB = chartB.birthInfo.name || '乙方';

  return `你是紫微斗数命理师，依据倪海厦《天纪》体系做双盘合参（合盘）分析。
合盘以双方的夫妻宫、命宫、福德宫为主线，结合三方四正与四化互动，判断关系格局、相处模式与需注意的关口。

【合盘方法论】
${HEMING_METHODOLOGY.trim()}

【命盘数据 · 甲方】
${chartToText(chartA, sourceA)}

【命盘数据 · 乙方】
${chartToText(chartB, sourceB)}

【双方夫妻宫主星断语（本仓库知识库原文）】
${fuqiBrief(chartA, sourceA)}

${fuqiBrief(chartB, sourceB)}

${HOUSE_RULES}
7. 合盘结论要指明依据的是哪一方的哪个宫位、哪颗星、哪组四化；双方信息对称呈现，不做单方面评判。
8. 关系建议保持中性，不替用户下「必须分手/必须结婚」这类结论。`;
}

/** 取某盘夫妻宫主星的断语（知识库未覆盖的星曜自动跳过） */
function fuqiBrief(chart: ZiweiChart, who: string): string {
  const fuqi = chart.palaces.find((p) => p.name.includes('夫妻'));
  if (!fuqi) return `${who}：未取到夫妻宫位置。`;

  const majors = fuqi.stars.filter((s) => s.type === 'major');
  if (!majors.length) return `${who}：夫妻宫空宫，按对宫借星论。`;

  const entries = majors
    .map((star) => {
      const record = STAR_IN_FUQI_GU[star.name];
      if (!record) return `- ${star.name}：知识库暂无该星在夫妻宫的断语。`;
      const quote = record.ni_quote ? `；倪师原话「${record.ni_quote}」` : '';
      return `- ${star.name}：${record.summary}；吉象 ${record.good}；凶象 ${record.bad}；婚期 ${record.timing}${quote}`;
    })
    .join('\n');

  return `${who}夫妻宫${STEMS[fuqi.stem] ?? '?'}${BRANCHES[fuqi.branch] ?? '?'}：\n${entries}`;
}

const BAZI_RULES = `【解读纪律】
1. 所有结论必须能在上述八字盘数据中找到依据，禁止臆造未出现的干支、十神、藏干、格局、神煞或大运流年。
2. 论格局取用一律以月令为纲：须说明立格依据的是月支本气/月令藏干中的哪一支、是否透干。
3. 论旺衰须点明依据的是得令、长生、得地、得势中的哪几项，以及月令的旺相休囚死，不空言「身强身弱」。
4. 论调候用神须说明是《穷通宝鉴》十干十二月取用法，并注明「各家流派对个别月份有微调」。
5. 论大运流年须指明干支、对应十神与所在年龄段（大运重地支、流年重天干），并结合原局喜忌说明，不孤立地断吉凶。
6. 论贵气、事业、财官时，可用《滴天髓》「官星有理会」的取用思路——官星是否得财生、得印卫、能制劫，落到本盘的具体干支上。
7. 语言为简体中文；命理专有名词若需英文表述，采用「拼音 + 英文注释」，不做意译。
8. 语气专业克制；健康、财务、法律相关只给建议性表述，不做确定性指令或命运承诺。
9. 不使用 Markdown 表格与代码块；用小标题与短段落排版。段落标题固定写作 \`**【段落名】**\`（整行独立），强调只用 \`**加粗**\`，不叠加其他 Markdown 语法。`;

/** 八字解读的系统提示词（依据《渊海子平》《子平真诠》《三命通会》《滴天髓》《穷通宝鉴》） */
export function buildBaziSystemPrompt(chart: BaziChart, question?: string): string {
  const head = `你是八字命理师，按子平法的论命次第为用户解读四柱八字：先立日主、再看月令提纲、次论格局与调候、后参大运流年。
解读必须落在具体的干支、十神、藏干、格局与运岁上，说清「依据—结论—建议」的链条。`;

  const extra = question
    ? `\n\n【本次提问】\n${question}\n请先给出与本盘相关的总体判断，再逐条回应上述提问。`
    : `\n\n【输出结构】请按以下段落依次作答：
**【命局总览】** 日主与月令提纲、格局与旺衰的一句话概括
**【旺衰与用神】** 得令/长生/得地/得势的分项依据，推断喜忌
**【格局与调候】** 立格依据、顺用或逆用、调候用神及其理由
**【十神与六亲】** 天干十神与藏干十神反映的性格、事业、财、官、印、食等倾向
**【大运流年】** 当前大运与近十年流年的走势要点与关键年份
**【行事建议】** 结合喜忌给出方位、行业、用事时节等可操作建议`;

  return `${head}

【典籍依据】
${BAZI_METHODOLOGY}

${BAZI_QUOTE_RULE}

【八字盘数据 · 本仓库排盘引擎输出（模型解读的唯一数据来源）】
${baziToText(chart)}

${BAZI_RULES}${extra}`;
}