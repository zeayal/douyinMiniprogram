

/**
 * 检测是否处于单页模式（朋友圈分享场景）
 * 场景值 1154 表示从朋友圈打开小程序
 */
export const isSinglePageMode = (): boolean => {
  try {
    // 获取启动参数中的场景值
    const launchOptions = tt.getLaunchOptionsSync();
    return launchOptions.scene === 1154;
  } catch (error) {
    console.error('获取启动参数失败:', error);
    return false;
  }
};

/**
 * 获取当前场景值
 */
export const getCurrentScene = (): number => {
  try {
    const launchOptions = tt.getLaunchOptionsSync();
    return launchOptions.scene;
  } catch (error) {
    console.error('获取场景值失败:', error);
    return 0;
  }
};



// 同步：快速判断是否为 iOS
export function isIOS() {
  try {
    const systemInfo = getDeviceInfoSync();
    if (!systemInfo) {
      return false
    }

    const platform = (systemInfo.platform || '').toLowerCase(); // 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'devtools'
    const system = (systemInfo.system || '').toLowerCase();     // 如 'iOS 17.5'
    return platform === 'ios' || system.includes('ios');
  } catch {
    return false;
  }
}

// 同步：判断是否为鸿蒙系统
export function isHarmonyOS() {
  try {
    const systemInfo = getDeviceInfoSync();
    if (!systemInfo) {
      return false
    }

    // 方法1：通过 system 字段判断（推荐）
    if (systemInfo.system && systemInfo.system.toLowerCase().includes('harmony')) {
      return true;
    }

    // 方法2：通过 brand 字段判断（备选）
    if (systemInfo.brand && systemInfo.brand.toLowerCase().includes('huawei')) {
      // 华为设备 + 非安卓系统 = 很可能是鸿蒙
      if (systemInfo.system && !systemInfo.system.toLowerCase().includes('android')) {
        return true;
      }
    }

    // 方法3：通过 platform 字段判断
    if (systemInfo.platform === 'devtools') {
      // 开发工具中，可以通过自定义参数模拟
      return false;
    }

    return false;
  } catch (error) {
    console.error('获取系统信息失败:', error);
    return false;
  }
}


// 同步：判断 PC（含 Windows/Mac/Linux）
export function isPC() {
  try {
    const si = getDeviceInfoSync();
    if (!si) {
      return false
    }
    const platform = (si.platform || '').toLowerCase(); // 'ios' | 'android' | 'windows' | 'mac' | 'devtools' | 可能为 'linux'
    const system = (si.system || '').toLowerCase();     // 如 'Windows 10', 'macOS 14.5', 'Linux ...'

    // 明确平台命中
    if (['windows', 'mac', 'linux'].some(p => platform.includes(p))) return true;

    // system 兜底命中
    if (['windows', 'mac os', 'macos', 'linux'].some(s => system.includes(s))) return true;

    // 开发者工具兜底：非 iOS/Android 视为 PC
    if (platform === 'devtools' && !/(ios|android)/.test(system)) return true;

    return false;
  } catch (e) {
    return false;
  }
}

// 同步：判断 Android（优先使用基础库 2.20.1+ 的 getDeviceInfo）
export function isAndroid(): boolean {
  try {
    const info = getDeviceInfoSync();
    if (!info) {
      return false
    }
    const system = (info.system || '').toLowerCase();   // e.g. 'android 13', 'harmonyos 4.0', 'iOS 17'
    const platform = (info.platform || '').toLowerCase(); // e.g. 'android' | 'ios' | 'windows' | 'mac' | ...

    // 排除鸿蒙，再判断安卓
    if (system.includes('harmony')) return false;
    return platform === 'android' || system.includes('android');
  } catch {
    return false;
  }
}

/**
 * 获取详细的系统信息
 * 
 */
export function getDeviceInfoSync() {
  try {
    let deviceInfo = null;
    if (tt.getDeviceInfo) {
      deviceInfo = tt.getDeviceInfoSync()
    } else {
      deviceInfo = tt.getSystemInfoSync ? tt.getSystemInfoSync() : null
    }
    if (deviceInfo) {
      return {
        system: deviceInfo.system,        // 操作系统版本
        platform: deviceInfo.platform,    // 客户端平台
        brand: deviceInfo.brand,          // 设备品牌
        model: deviceInfo.model,          // 设备型号。新机型刚推出一段时间会显示unknown
      };
    }
    return null
  } catch (error) {
    console.error('获取系统信息失败:', error);
    return null;
  }
}