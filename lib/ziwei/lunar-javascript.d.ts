declare module 'lunar-javascript' {
  class Lunar {
    /** month 为负表示闰月（如 -5 = 闰五月） */
    static fromYmd(year: number, month: number, day: number): Lunar;
    getYear(): number;
    getMonth(): number;  // negative = leap month
    getDay(): number;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
/** 换算成公历(2026-08-05 补声明:lib/ziwei/share.ts 早在用，只是从前靠 as any 绕过) */
    getSolar(): Solar;
    /** 八字（四柱）对象(2026-10-29 补) */
    getEightChar(): EightChar;
    /** 上一个节气，含中气(2026-10-29 补) */
    getPrevJieQi(): JieQi;
    /** 下一个节气，含中气(2026-10-29 补) */
    getNextJieQi(): JieQi;
    /** 中文农历描述，如「一九九〇年五月廿二」(2026-10-29 补) */
    toString(): string;
  }

  class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    /** 八字排盘需精确到时辰中点(2026-10-29 补) */
    static fromYmdHms(
      year: number, month: number, day: number, hour: number, minute: number, second: number,
    ): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    /** 如 1997-11-15(2026-10-29 补) */
    toYmd(): string;
    /** 如 1990-06-06 06:46:18(2026-10-29 补) */
    toYmdHms(): string;
  }

  /** 农历月信息(2026-06-10 补:闰月大小月边界 clamp 用) */
  class LunarMonth {
    /** month 为负表示闰月(如 -5 = 闰五月);查无此月返回 null */
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }

  // —— 以下为 2026-10-29 八字排盘（lib/bazi）新增声明 ——

  /** 节气(八字月令边界与「生于某节气之后」展示用) */
  class JieQi {
    getName(): string;
    getSolar(): Solar;
  }

  /**
   * 八字四柱对象(lib/bazi/engine.ts 使用)。
   * lunar-javascript 用 __defineGetter__ 把方法挂在实例上，原型枚举探测不到，
   * 以下成员按 v1.7.7 实测结果声明。
   */
  class EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    /** 时柱（注意：不是 getHour()，v1.7.7 无此方法） */
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    /** 地支藏干，顺序为本气→中气→余气 */
    getYearHideGan(): string[];
    getMonthHideGan(): string[];
    getDayHideGan(): string[];
    getTimeHideGan(): string[];
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    /** 日干在该支的十二长生位 */
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    getYearXun(): string;
    getMonthXun(): string;
    getDayXun(): string;
    getTimeXun(): string;
    getYearXunKong(): string;
    getMonthXunKong(): string;
    getDayXunKong(): string;
    getTimeXunKong(): string;
    getTaiYuan(): string;
    getTaiYuanNaYin(): string;
    getTaiXi(): string;
    getTaiXiNaYin(): string;
    getMingGong(): string;
    getMingGongNaYin(): string;
    getShenGong(): string;
    getShenGongNaYin(): string;
    /** gender: 1 = 男, 0 = 女 */
    getYun(gender: number, sect?: number): Yun;
  }

  /** 起运与大运 */
  class Yun {
    /** true 顺行（阳男阴女），false 逆行 */
    isForward(): boolean;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartSolar(): Solar;
    getDaYun(): DaYun[];
  }

  class DaYun {
    /** 0 号为起运前的一段（无干支） */
    getIndex(): number;
    getGanZhi(): string;
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
    getLiuNian(): LiuNian[];
    getXiaoYun(): XiaoYun[];
  }

  class LiuNian {
    getYear(): number;
    /** 虚岁 */
    getAge(): number;
    getGanZhi(): string;
  }

  class XiaoYun {
    getYear(): number;
    getAge(): number;
    getGanZhi(): string;
  }
}
