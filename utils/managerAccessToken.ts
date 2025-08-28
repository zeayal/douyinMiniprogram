import { BASE_URL } from "../constants/common";
import { storage } from "./storage";

const ACCESS_TOKEN_KEY = "access_token_info";
const REFRESH_TOKEN_KEY = "refresh_token";

let memoryCache: { token: string; expireTime: number } | undefined;

// 存储刷新令牌的Promise，防止并发请求
let refreshingPromise: Promise<void> | null = null;

// 存储微信登录的Promise，防止并发请求
let wxLoginPromise: Promise<void> | null = null;

// access_token 是否有效
const isTokenValid = (tokenInfo: { token: string; expireTime: number }) => {
  if (!tokenInfo) {
    return false;
  }
  const { token, expireTime } = tokenInfo;
  return token && Date.now() < expireTime;
};

// 获取 access_token
export const getAccessToken: (source?: string) => Promise<string> = async (source?: string) => {
  // 1.先检查内存中是否存在，存在且有效期内直接返回
  if (memoryCache && isTokenValid(memoryCache)) {
    return memoryCache.token;
  }
  // 2.内存中没有数据，直接读取storage
  const storageData: any = await storage.getItemAsync(ACCESS_TOKEN_KEY);
  if (storageData && isTokenValid(storageData)) {
    memoryCache = storageData;
    return storageData.token;
  }

  // 3.storage 无效，直接请求刷新最新 token
  return await refreshAccessToken(source);
};

const wxloginGetBothToken = async (source?: string | null) => {
  // 如果已经在刷新中，直接返回等待结果
  if (wxLoginPromise) {
    return wxLoginPromise.then((accessToken) => accessToken);
  }

  wxLoginPromise = new Promise((resolve, reject) => {
    tt.login({
      success: async (res: any) => {
        if (res.code) {
          try {
            const response: any = await new Promise((resolve, reject) => {
              tt.request({
                enableHttp2: true,
                url: BASE_URL + "/api/auth/wxLogin",
                method: "GET",
                data: { code: res.code, source },
                header: {
                  "Content-Type": "application/json",
                  platform: "mp-toutiao",
                },
                success: (res: any) => resolve(res.data),
                fail: reject,
              });
            });

            if (response.code === 0) {
              const { accessToken, expiresIn, refreshToken } = response.data;
              memoryCache = {
                token: accessToken,
                expireTime: Date.now() + (expiresIn - 100) * 1000, // access_token 提前100秒过期
              };

              storage.setItemAsync(ACCESS_TOKEN_KEY, memoryCache);
              storage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
              resolve(accessToken);
            } else {
              reject(new Error("登录失败: " + response.msg));
            }
          } catch (error) {
            console.log("登录失败: ", error);
            reject(new Error("登录失败: " + error.message));
          }
        } else {
          console.log("登录失败！" + res.errMsg);
          reject(new Error("登录失败: " + res.errMsg));
        }
      },
      fail: (err) => {
        console.error("微信登录失败:", err);
        reject(new Error("微信登录失败: " + err.errMsg));
      },
    });
  });

  try {
    return await wxLoginPromise;
  } catch (error) {
    console.error("wxloginGetBothToken 捕获错误:", error);
    throw error; // 重新抛出错误，由调用者处理
  } finally {
    wxLoginPromise = null;
  }
};

const refreshAccessToken = async (source?: string) => {
  const refreshToken = await storage.getItemAsync(REFRESH_TOKEN_KEY);
  // 如果没有 refreshToken
  if (!refreshToken) {
    return await wxloginGetBothToken(source);
  }

  // 如果已经在刷新中，直接返回等待结果
  if (refreshingPromise) {
    return refreshingPromise.then((accessToken) => accessToken);
  }

  try {
    refreshingPromise = new Promise(async (resolve, reject) => {
      try {
        const response: any = await new Promise((resolve, reject) => {
          tt.request({
            enableHttp2: true,
            url: BASE_URL + "/api/auth/refreshToken",
            method: "GET",
            data: { refreshToken },
            header: {
              "Content-Type": "application/json",
              platform: "mp-toutiao",
            },
            success: (res: any) => resolve(res.data),
            fail: reject,
          });
        });

        if (response.code === 0) {
          const { accessToken, expiresIn, refreshToken } = response.data;
          memoryCache = {
            token: accessToken,
            expireTime: Date.now() + (expiresIn - 100) * 1000, // access_token 提前100秒过期
          };
          storage.setItemAsync(ACCESS_TOKEN_KEY, memoryCache);
          storage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
          resolve(accessToken);
        } else {
          throw new Error("刷新token失败");
        }
      } catch (error) {
        // 刷新失败，清除token并重新登录
        memoryCache = undefined;
        storage.removeItem(ACCESS_TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
        resolve();
        await wxloginGetBothToken(source);
      }
    });

    await refreshingPromise;
    return memoryCache?.token;
  } finally {
    refreshingPromise = null;
  }
};

export { refreshAccessToken, wxloginGetBothToken };
