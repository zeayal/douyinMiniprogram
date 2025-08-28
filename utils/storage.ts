



const storage = {
  // 基础存储方法
  getItem(key: string) {
    return wx.getStorageSync(key);
  },

  async getItemAsync(key: string, options?: any) {
    try {
      const res: any = await wx.getStorage({
        key,
        ...options
      })
      return res.data;
    } catch (error) {
      console.log('getItemAsyncError key:', key, error)
      return undefined
    };
  },

  setItem(key: string, value: any) {
    wx.setStorageSync(key, value);
  },

  async setItemAsync(key: string, value: any, options?: any) {
    try {
      await wx.setStorage({ key, data: value, ...options });
    } catch (e) {
      console.log('setItemAsyncError key: value:', key, value, e)
    }
  },

  removeItem(key: string) {
    wx.removeStorageSync(key);
  },

  clearStorage() {
    wx.clearStorageSync();
  }
}



export {
  storage
}