



const storage = {
  // 基础存储方法
  getItem(key: string) {
    return tt.getStorageSync(key);
  },

  async getItemAsync(key: string) {
    return new Promise((resolve) => {
      tt.getStorage({
        key,
        success: (res: any) => {
          resolve(res.data)
        },
        fail: (error: any) => {
          console.log('getItemAsyncError key:', key, error)
          resolve(undefined)
        },
        complete: () => {

        }
      })
    })
  },

  setItem(key: string, value: any) {
    tt.setStorageSync(key, value);
  },

  async setItemAsync(key: string, value: any) {
    return new Promise((resolve) => {
      tt.setStorage({
        key: key,
        data: value,
        success: () => {
          resolve(true);
        },
        fail: (e: any) => {
          console.log('setItemAsyncError key: value:', key, value, e)
        },
        complete: () => {
          console.log('setItemAsync:complete');
        }
      });
    })




  },

  removeItem(key: string) {
    tt.removeStorageSync(key);
  },

  clearStorage() {
    tt.clearStorageSync();
  }
}



export {
  storage
}