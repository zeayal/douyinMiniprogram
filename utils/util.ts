import { storage } from "./storage";
import debounce from "../utils/debounce";
import { isIOS } from "./device";

export const formatTime = (date: Date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return (
    [year, month, day].map(formatNumber).join("/") +
    " " +
    [hour, minute, second].map(formatNumber).join(":")
  );
};

export const formatDate = (date: Date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return [year, month, day].map(formatNumber).join("/");
};

const formatNumber = (n: number) => {
  const s = n.toString();
  return s[1] ? s : "0" + s;
};

const isVip = () => {
  const userInfo = storage.getItem("userInfo");
  if (userInfo) {
    return userInfo.isVip === true;
  }
  return false;
};

export const checkIsVip = (tag = "") => {
  // 先免费使用
  if (isVip()) {
    return true;
  }

  wx.showToast({
    title: isIOS()
      ? `赶快购买实物车贴获取${tag}功能吧`
      : `赶快成为会员用户获取${tag}功能吧`,
    icon: "none",
    duration: 3000,
  });

  setTimeout(() => {
    wx.navigateTo({
      url: "/pages/vip/vip",
    });
  }, 2000);

  return false;
};
export function mergeArraysById(arr1: any, arr2: any) {
  const map = new Map();

  // 先将第一个数组的元素存入Map
  for (const item of arr1) {
    map.set(item.id, item);
  }

  // 再处理第二个数组，如果有相同id的元素，用第二个数组的元素覆盖
  for (const item of arr2) {
    map.set(item.id, item);
  }

  // 将Map中的元素转换为数组返回
  return Array.from(map.values());
}

export const getMarkerColor = (rating: number) => {
  const colors = {
    0: "#006400", // 零星 - 绿色
    1: "#006400", // 一星 - 绿色
    2: "#006400", // 二星 - 绿色
    3: "#FF8C00", // 三星 - 琥珀色（明显对比）
    4: "#DC143C", // 四星 - 红色（强烈对比）
    5: "#9932CC", // 五星 - 紫色（最高级）
  };
  return colors[rating] || colors[0];
};

/**
 * 检查颜色是否与需要避开的颜色相近
 * @param color 要检查的颜色（十六进制格式）
 * @param avoidColors 需要避开的颜色数组
 * @param threshold 相似度阈值（0-100，越小越严格）
 * @returns 如果颜色应该避开返回true，否则返回false
 */
export const shouldAvoidColor = (
  color: string,
  avoidColors: string[] = [],
  threshold: number = 25
): boolean => {
  if (!color || !color.startsWith("#")) return false;

  // 默认需要避开的颜色
  const defaultAvoidColors = ["#006400", "#FF8C00", "#DC143C", "#9932CC"];
  const allAvoidColors = [...defaultAvoidColors, ...avoidColors];

  const colorRgb = hexToRgb(color);

  for (const avoidColor of allAvoidColors) {
    if (avoidColor === color) return true;

    const avoidRgb = hexToRgb(avoidColor);
    const similarity = calculateColorSimilarity(colorRgb, avoidRgb);

    if (similarity <= threshold) {
      return true;
    }
  }

  return false;
};

/**
 * 将十六进制颜色转换为RGB对象
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

/**
 * 计算两个RGB颜色之间的相似度
 * @returns 相似度百分比（0-100，100表示完全相同）
 */
const calculateColorSimilarity = (
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number }
): number => {
  const deltaR = Math.abs(rgb1.r - rgb2.r);
  const deltaG = Math.abs(rgb1.g - rgb2.g);
  const deltaB = Math.abs(rgb1.b - rgb2.b);

  // 使用欧几里得距离计算相似度
  const distance = Math.sqrt(
    deltaR * deltaR + deltaG * deltaG + deltaB * deltaB
  );
  const maxDistance = Math.sqrt(255 * 255 + 255 * 255 + 255 * 255);

  return ((maxDistance - distance) / maxDistance) * 100;
};

/**
 * 检查两个颜色之间是否过于相似
 * @param color1 第一个颜色
 * @param color2 第二个颜色
 * @param threshold 相似度阈值（0-100，越小越严格）
 * @returns 如果颜色过于相似返回true，否则返回false
 */
export const areColorsTooSimilar = (
  color1: string,
  color2: string,
  threshold: number = 35
): boolean => {
  if (!color1 || !color2) return false;

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const similarity = calculateColorSimilarity(rgb1, rgb2);

  return similarity <= threshold;
};

/**
 * 获取安全的颜色建议，避开需要避开的颜色，并确保颜色间有足够差异
 * @param count 需要的颜色数量
 * @returns 安全的颜色数组
 */
export const getSafeColorSuggestions = (count: number = 12): string[] => {
  // 经过优化的安全颜色，确保与需要避开的颜色有足够差异
  const allSafeColors = [
    // 蓝色系 - 与绿色、红色、紫色都有明显差异
    "#1E90FF", // 道奇蓝 - 明亮蓝色
    "#00BFFF", // 深天蓝 - 清新蓝色
    "#87CEEB", // 天蓝色 - 浅蓝色
    "#4682B4", // 钢蓝色 - 深蓝色

    // 青色系 - 与绿色、红色、紫色都有明显差异
    "#20B2AA", // 浅海洋绿 - 青绿色
    "#48D1CC", // 中绿松石 - 亮青色
    "#7FFFD4", // 绿松石 - 浅青色
    "#00CED1", // 暗绿松石 - 深青色

    // 粉色系 - 与绿色、红色、紫色都有明显差异
    "#FF69B4", // 热粉红 - 亮粉色
    "#FFB6C1", // 浅粉红 - 浅粉色
    "#FFC0CB", // 粉红色 - 标准粉色
    "#DC143C", // 深红色 - 深粉色（注意：这个与需要避开的颜色冲突，需要替换）

    // 橙色系 - 与绿色、红色、紫色都有明显差异
    "#FFA500", // 橙色 - 标准橙色
    "#FF8C00", // 深橙色 - 深橙色（注意：这个与需要避开的颜色冲突，需要替换）
    "#FF7F50", // 珊瑚色 - 珊瑚橙色
    "#FF6347", // 番茄色 - 红橙色

    // 黄色系 - 与绿色、红色、紫色都有明显差异
    "#FFD700", // 金色 - 标准金色
    "#FFFF00", // 黄色 - 纯黄色
    "#FFEFD5", // 桃色 - 浅黄色
    "#F0E68C", // 卡其色 - 卡其黄色

    // 紫色系 - 与绿色、红色都有明显差异（但需要避开#9932CC）
    "#9370DB", // 中紫色 - 中等紫色
    "#8A2BE2", // 蓝紫色 - 蓝紫色
    "#DA70D6", // 兰花紫 - 粉紫色
    "#DDA0DD", // 梅红色 - 浅紫色
  ];

  // 过滤掉与需要避开的颜色相近的颜色
  const filteredColors = allSafeColors.filter(
    (color) => !shouldAvoidColor(color)
  );

  // 进一步过滤，确保颜色间有足够差异
  const finalColors: string[] = [];
  for (const color of filteredColors) {
    let isUnique = true;

    // 检查是否与已选择的颜色过于相似
    for (const selectedColor of finalColors) {
      if (areColorsTooSimilar(color, selectedColor, 40)) {
        isUnique = false;
        break;
      }
    }

    if (isUnique) {
      finalColors.push(color);
      if (finalColors.length >= count) break;
    }
  }

  // 如果过滤后的颜色不够，添加一些备用颜色
  if (finalColors.length < count) {
    const backupColors = [
      "#32CD32", // 酸橙绿 - 与深绿色有明显差异
      "#00FA9A", // 春绿色 - 明亮绿色
      "#98FB98", // 淡绿色 - 浅绿色
      "#90EE90", // 浅绿色 - 标准浅绿
      "#ADFF2F", // 绿黄色 - 黄绿色
      "#9ACD32", // 黄绿色 - 橄榄绿
      "#6B8E23", // 橄榄绿 - 深橄榄绿
      "#556B2F", // 深橄榄绿 - 深色橄榄绿
    ];

    for (const backupColor of backupColors) {
      if (finalColors.length >= count) break;

      if (!shouldAvoidColor(backupColor)) {
        let isUnique = true;
        for (const selectedColor of finalColors) {
          if (areColorsTooSimilar(backupColor, selectedColor, 40)) {
            isUnique = false;
            break;
          }
        }

        if (isUnique) {
          finalColors.push(backupColor);
        }
      }
    }
  }

  return finalColors.slice(0, count);
};

/**
 * 将RGB颜色转换为HSL
 */
const rgbToHsl = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

/**
 * 检查两个颜色在HSL空间中的差异
 * @param color1 第一个颜色
 * @param color2 第二个颜色
 * @returns 如果颜色差异足够返回true，否则返回false
 */
export const areColorsDistinctInHSL = (
  color1: string,
  color2: string
): boolean => {
  if (!color1 || !color2) return false;

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
  const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);

  // 检查色相差异（至少30度）
  const hueDiff = Math.min(
    Math.abs(hsl1.h - hsl2.h),
    360 - Math.abs(hsl1.h - hsl2.h)
  );

  // 检查饱和度差异（至少15%）
  const satDiff = Math.abs(hsl1.s - hsl2.s);

  // 检查亮度差异（至少20%）
  const lightDiff = Math.abs(hsl1.l - hsl2.l);

  return hueDiff >= 30 || satDiff >= 15 || lightDiff >= 20;
};

/**
 * 获取优化的安全颜色建议，使用多重过滤确保颜色间有足够差异
 * @param count 需要的颜色数量
 * @returns 优化的安全颜色数组
 */
export const getOptimizedSafeColors = (count: number = 12): string[] => {
  // 第一层：基础安全颜色
  const baseColors = [
    // 蓝色系 - 与绿色、红色、紫色都有明显差异
    "#1E90FF", // 道奇蓝
    "#00BFFF", // 深天蓝
    "#87CEEB", // 天蓝色
    "#4682B4", // 钢蓝色

    // 青色系
    "#20B2AA", // 浅海洋绿
    "#48D1CC", // 中绿松石
    "#7FFFD4", // 绿松石
    "#00CED1", // 暗绿松石

    // 粉色系
    "#FF69B4", // 热粉红
    "#FFB6C1", // 浅粉红
    "#FFC0CB", // 粉红色
    "#FF1493", // 深粉红

    // 橙色系
    "#FFA500", // 橙色
    "#FF7F50", // 珊瑚色
    "#FF6347", // 番茄色
    "#FF4500", // 橙红色

    // 黄色系
    "#FFD700", // 金色
    "#FFFF00", // 黄色
    "#FFEFD5", // 桃色
    "#F0E68C", // 卡其色

    // 紫色系
    "#9370DB", // 中紫色
    "#8A2BE2", // 蓝紫色
    "#DA70D6", // 兰花紫
    "#DDA0DD", // 梅红色
  ];

  // 第二层：过滤掉与需要避开的颜色相近的颜色
  const filteredColors = baseColors.filter(
    (color) => !shouldAvoidColor(color, [], 20)
  );

  // 第三层：使用HSL空间确保颜色间有足够差异
  const optimizedColors: string[] = [];

  for (const color of filteredColors) {
    let isDistinct = true;

    // 检查是否与已选择的颜色有足够差异
    for (const selectedColor of optimizedColors) {
      if (!areColorsDistinctInHSL(color, selectedColor)) {
        isDistinct = false;
        break;
      }
    }

    if (isDistinct) {
      optimizedColors.push(color);
      if (optimizedColors.length >= count) break;
    }
  }

  // 第四层：如果颜色不够，添加一些经过严格筛选的备用颜色
  if (optimizedColors.length < count) {
    const backupColors = [
      "#32CD32", // 酸橙绿
      "#00FA9A", // 春绿色
      "#98FB98", // 淡绿色
      "#90EE90", // 浅绿色
      "#ADFF2F", // 绿黄色
      "#9ACD32", // 黄绿色
      "#6B8E23", // 橄榄绿
      "#556B2F", // 深橄榄绿
    ];

    for (const backupColor of backupColors) {
      if (optimizedColors.length >= count) break;

      // 严格检查备用颜色
      if (!shouldAvoidColor(backupColor, [], 15)) {
        let isDistinct = true;
        for (const selectedColor of optimizedColors) {
          if (!areColorsDistinctInHSL(backupColor, selectedColor)) {
            isDistinct = false;
            break;
          }
        }

        if (isDistinct) {
          optimizedColors.push(backupColor);
        }
      }
    }
  }

  return optimizedColors.slice(0, count);
};
