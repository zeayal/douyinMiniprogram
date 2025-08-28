import { isHarmonyOS, isPC } from "./device";
import { storage } from "./storage";

/**
 * 计算两个经纬度坐标之间的距离（单位：公里）
 * @param {number} lat1 - 用户当前纬度
 * @param {number} lon1 - 用户当前经度
 * @param {number} lat2 - 营地纬度
 * @param {number} lon2 - 营地经度
 * @returns {number | null} 距离（公里）或null（出错时）
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  try {
    // 参数验证
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
      console.warn('无效的坐标参数:', { lat1, lon1, lat2, lon2 });
      return null;
    }

    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // 距离（公里）

    return isNaN(distance) ? null : distance;
  } catch (error) {
    console.error('计算距离时发生错误:', error);
    return null;
  }
}

/**
 * 计算GCJ02坐标系下两个坐标点之间的精确距离（单位：米）
 * 专门针对短距离（< 1km）优化，适用于中国大陆地区
 * @param {number} lat1 - 纬度1 (GCJ02)
 * @param {number} lon1 - 经度1 (GCJ02)
 * @param {number} lat2 - 纬度2 (GCJ02)
 * @param {number} lon2 - 经度2 (GCJ02)
 * @returns {number | null} 距离（米）或null（出错时）
 */
export function calculateDistanceGCJ02(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  try {
    // 参数验证
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
      console.warn('无效的GCJ02坐标参数:', { lat1, lon1, lat2, lon2 });
      return null;
    }

    // 对于超短距离（< 100米），使用平面近似
    if (Math.abs(lat1 - lat2) < 0.0001 && Math.abs(lon1 - lon2) < 0.0001) {
      return calculateDistancePlane(lat1, lon1, lat2, lon2);
    }

    // 对于短距离（< 1km），使用优化的Haversine公式
    if (Math.abs(lat1 - lat2) < 0.01 && Math.abs(lon1 - lon2) < 0.01) {
      return calculateDistanceShort(lat1, lon1, lat2, lon2);
    }

    // 对于长距离，使用标准Haversine公式
    return calculateDistanceHaversine(lat1, lon1, lat2, lon2);
  } catch (error) {
    console.error('计算GCJ02距离时发生错误:', error);
    return null;
  }
}

/**
 * 平面近似距离计算（单位：米）
 * 适用于超短距离（< 100米）
 * @param {number} lat1 - 纬度1
 * @param {number} lon1 - 经度1
 * @param {number} lat2 - 纬度2
 * @param {number} lon2 - 经度2
 * @returns {number | null} 距离（米）或null（出错时）
 */
function calculateDistancePlane(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  try {
    // 地球半径（米）
    const R = 6371000;

    // 计算经纬度差值（度）
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    // 转换为弧度
    const dLatRad = dLat * Math.PI / 180;
    const dLonRad = dLon * Math.PI / 180;

    // 平面近似公式
    const distance = R * Math.sqrt(dLatRad * dLatRad + dLonRad * dLonRad);

    return isNaN(distance) ? null : distance;
  } catch (error) {
    console.error('平面距离计算错误:', error);
    return null;
  }
}

/**
 * 短距离优化计算（单位：米）
 * 适用于短距离（100米 - 1公里）
 * @param {number} lat1 - 纬度1
 * @param {number} lon1 - 经度1
 * @param {number} lat2 - 纬度2
 * @param {number} lon2 - 经度2
 * @returns {number | null} 距离（米）或null（出错时）
 */
function calculateDistanceShort(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  try {
    // 地球半径（米）
    const R = 6371000;

    // 转换为弧度
    const lat1Rad = lat1 * Math.PI / 180;
    const lon1Rad = lon1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lon2Rad = lon2 * Math.PI / 180;

    // 计算经纬度差值
    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;

    // 使用优化的Haversine公式
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return isNaN(distance) ? null : distance;
  } catch (error) {
    console.error('短距离计算错误:', error);
    return null;
  }
}

/**
 * 标准Haversine距离计算（单位：米）
 * 适用于长距离（> 1公里）
 * @param {number} lat1 - 纬度1
 * @param {number} lon1 - 经度1
 * @param {number} lat2 - 纬度2
 * @param {number} lon2 - 经度2
 * @returns {number | null} 距离（米）或null（出错时）
 */
function calculateDistanceHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  try {
    // 地球半径（米）
    const R = 6371000;

    // 转换为弧度
    const lat1Rad = lat1 * Math.PI / 180;
    const lon1Rad = lon1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lon2Rad = lon2 * Math.PI / 180;

    // 计算经纬度差值
    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;

    // Haversine公式
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return isNaN(distance) ? null : distance;
  } catch (error) {
    console.error('Haversine距离计算错误:', error);
    return null;
  }
}

/**
 * 计算GCJ02坐标系下两个坐标点之间的距离并返回格式化结果
 * 智能选择最适合的计算方法，自动格式化显示
 * @param {number} lat1 - 纬度1 (GCJ02)
 * @param {number} lon1 - 经度1 (GCJ02)
 * @param {number} lat2 - 纬度2 (GCJ02)
 * @param {number} lon2 - 经度2 (GCJ02)
 * @returns {string | null} 格式化后的距离字符串或null（出错时）
 */
export function getFormattedDistance(lat1: number, lon1: number, lat2: number, lon2: number): string | null {
  try {
    const distanceInMeters = calculateDistanceGCJ02(lat1, lon1, lat2, lon2);
    if (distanceInMeters === null) {
      return null;
    }
    return formatDistance(distanceInMeters);
  } catch (error) {
    console.error('获取格式化距离时发生错误:', error);
    return null;
  }
}

/**
 * 计算GCJ02坐标系下两个坐标点之间的距离并返回详细结果
 * @param {number} lat1 - 纬度1 (GCJ02)
 * @param {number} lon1 - 经度1 (GCJ02)
 * @param {number} lat2 - 纬度2 (GCJ02)
 * @param {number} lon2 - 经度2 (GCJ02)
 * @returns {object | null} 包含距离数值和格式化字符串的对象或null（出错时）
 */
export function getDistanceInfo(lat1: number, lon1: number, lat2: number, lon2: number) {
  try {
    const distanceInMeters = calculateDistanceGCJ02(lat1, lon1, lat2, lon2);
    if (distanceInMeters === null) {
      return null;
    }
    return {
      meters: Math.round(distanceInMeters),
      kilometers: distanceInMeters / 1000,
      formatted: formatDistance(distanceInMeters)
    };
  } catch (error) {
    console.error('获取距离信息时发生错误:', error);
    return null;
  }
}

/**
 * 计算GCJ02坐标系下两个坐标点之间的精确距离（单位：公里）
 * @param {number} lat1 - 纬度1 (GCJ02)
 * @param {number} lon1 - 经度1 (GCJ02)
 * @param {number} lat2 - 纬度2 (GCJ02)
 * @param {number} lon2 - 经度2 (GCJ02)
 * @returns {number | null} 距离（公里）或null（出错时）
 */
export function calculateDistanceGCJ02Km(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  try {
    const distanceInMeters = calculateDistanceGCJ02(lat1, lon1, lat2, lon2);
    if (distanceInMeters === null) {
      return null;
    }
    return distanceInMeters / 1000;
  } catch (error) {
    console.error('计算GCJ02公里距离时发生错误:', error);
    return null;
  }
}

/**
 * 格式化距离显示
 * @param {number} distanceInMeters - 距离（米）
 * @returns {string | null} 格式化后的距离字符串或null（出错时）
 */
export function formatDistance(distanceInMeters: number): string | null {
  try {
    // 参数验证
    if (typeof distanceInMeters !== 'number' || isNaN(distanceInMeters)) {
      return null;
    }

    if (distanceInMeters < 0) {
      return null;
    }

    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}米`;
    } else {
      const km = distanceInMeters / 1000;
      if (km < 10) {
        return `${km.toFixed(1)}公里`;
      } else {
        return `${Math.round(km)}公里`;
      }
    }
  } catch (error) {
    console.error('格式化距离时发生错误:', error);
    return null;
  }
}

/**
 * 验证坐标是否有效
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @returns {boolean} 坐标是否有效
 */
function isValidCoordinate(lat: number, lon: number): boolean {
  try {
    // 检查是否为数字
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return false;
    }

    // 检查是否为NaN或无穷大
    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
      return false;
    }

    // 检查纬度范围 (-90 到 90)
    if (lat < -90 || lat > 90) {
      return false;
    }

    // 检查经度范围 (-180 到 180)
    if (lon < -180 || lon > 180) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('坐标验证时发生错误:', error);
    return false;
  }
}


/**
 * 导航，兼容所有机型
 * @param location 
 * @param mapContext 
 */
export function navigationToLocation(location: { latitude: number, longitude: number, name: string }, mapContext?: any) {
  const { longitude, latitude, name } = location;
  // 鸿蒙/PC/或者上下文不可用， 就调用打开地理位置
  if (isHarmonyOS() || isPC() || !mapContext) {
    // 当前设备为鸿蒙系统 || 或者不存在 mapContext
    openLocation({ longitude, latitude, name });
    return
  }

  // 默认使用
  mapContext.openMapApp({
    longitude, // 目的地经度
    latitude, // 目的地纬度
    destination: name, // 目的地名称
    success: async function (res: any) {
      // 导航成功
      console.log('导航成功', res)
    },
    fail: function (err: any) {
      console.error("导航失败, 也可能是用户取消导航", { longitude, latitude, name }, err);
      const { errMsg } = err || {};
      if (typeof errMsg === 'string' && errMsg.toLocaleLowerCase().includes('cancel')) {
        // 用户主动取消导航，这里什么都不用做，直接返回
        return
      }
      // 其他错误，调用打开位置
      openLocation({ longitude, latitude, name });
    },
    complete: function (res: any) {
      // 导航结束
      console.log('导航结束', res)
    },
  });
}

/**
 * 打开指定位置
 * @param latitude 
 * @param longitude 
 * @param name 
 */
export function openLocation(options: { latitude: number, longitude: number, name: string }) {
  const { latitude, longitude, name } = options;
  tt.openLocation({
    latitude,
    longitude,
    name,
    success: async function (res: any) {
      console.log('使用内置地图查看位置成功', res)
    },
    fail: function (err: any) {
      console.error("使用内置地图查看位置失败", err);
    },
    complete: function (res: any) {
      console.log('使用内置地图查看位置结束', res)
    },
  })
}

/**
 * 异步：获取当前定位
 */
export function getLocationAsync(options?: {
  showModalTip?: boolean
}) {
  return new Promise<{
    latitude: number,
    longitude: number,
  }>((resolve, reject) => {
    tt.getLocation({
      type: "gcj02",
      isHighAccuracy: true,
      success: (res: any) => {
        try {
          const { latitude: latitudeStr, longitude: longitudeStr } = res;
          const latitude = Number(latitudeStr);
          const longitude = Number(longitudeStr);
          tt.setStorage({ key: 'latitude', data: latitude });
          tt.setStorage({ key: 'longitude', data: longitude });
          resolve({ latitude, longitude })
        } catch (e) {
          console.error('异步：获取当前定位 setStorage Error', e);
        }
      },
      fail: (error: { errMsg: string }) => {
        if (options?.showModalTip) {
          showGPSLocationFailTip()
        }
        reject(error)
      }
    });
  })
}

export function showGPSLocationFailTip() {
  tt.showModal({
    title: `定位失败提示`,
    content: '请在小程序右上角三个点设置中允许获取当前位置 / 或者检查网络状态',
    showCancel: false,
    confirmText: '我知道了'
  });
}
