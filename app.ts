import { getAccessToken } from "./utils/managerAccessToken";
import { getServerPublicKey } from "./utils/managerServerPublicKey";
import { storage } from "./utils/storage";


interface IAppOption {
  _checkAndRefreshTokenInterval: any;
  globalData: Record<string, any>;
  initKey: any;
}

// app.ts
App<IAppOption>({
  _checkAndRefreshTokenInterval: null,
  globalData: {
    isFromBackground: false
  },
  onLaunch() {
    console.log('App onLaunch')
    this.initKey()
  },
  async onShow(options) {
    this.globalData.isFromBackground = true; // 标识小程序从后台唤起
    this.globalData.source = options?.query?.source
    try {
      if (options?.query?.source) {
        storage.setItemAsync('app_source_form', options?.query?.source);
      } else {
        this.globalData.source = await storage.getItemAsync('app_source_form') || ''
      }
    } catch (e) {
      console.error('app_source_formError', e);
    }

    // 定时刷新token
    if (!this._checkAndRefreshTokenInterval) {
      this._checkAndRefreshTokenInterval = setInterval(() => {
        getAccessToken(this.globalData.source);
      }, 5 * 60 * 1000);
    }

  },
  onHide() {
    if (this._checkAndRefreshTokenInterval) {
      clearInterval(this._checkAndRefreshTokenInterval);
      this._checkAndRefreshTokenInterval = null;
    }
  },
  // 初始化获取publicKey
  initKey() {
    getServerPublicKey();
  }
});
