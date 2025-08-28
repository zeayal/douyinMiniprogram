import { BASE_URL } from "../constants/common";
import {
  encryptWithAESCBC,
  generateRandomKey,
  encryptDataWithServerRSA,
  decryptWithAESCBC,
} from "./crypto";
import {
  getAccessToken,
  refreshAccessToken,
  wxloginGetBothToken,
} from "./managerAccessToken";
import { getServerPublicKey } from "./managerServerPublicKey";
interface WxResponse<T> {
  code: number;
  data: T;
  msg: string;
}

// 存储每个接口的最新请求任务
const requestTasks: { [key: string]: WechatMiniprogram.RequestTask } = {};

export const request = async <T>(options: {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
  data?: any;
  headers?: any;
}): Promise<WxResponse<T>> => {
  try {
    // 获取有效Token
    const accessToken = await getAccessToken();
    const { url, data, method, headers } = options;

    // 生成请求的唯一标识
    const requestKey = `${method}:${url}`;

    // 如果存在旧的请求，取消它
    if (requestTasks[requestKey]) {
      requestTasks[requestKey].abort();
    }
    return new Promise(async (resolve, reject) => {
      const serverRSAPublicKey = await getServerPublicKey();
      if (!serverRSAPublicKey) {
        reject(new Error("未找到服务器公钥"));
        return;
      }

      const encryptKey = generateRandomKey();
      const encryptWithAESCBCData = encryptWithAESCBC(
        JSON.stringify(data),
        encryptKey
      );
      const encryptPublicKeyWithServerRSA = encryptDataWithServerRSA(
        encryptKey,
        serverRSAPublicKey
      );

      const task = wx.request({
        enableHttp2: true,
        url: BASE_URL + url,
        data: {
          data: encryptWithAESCBCData.ciphertext,
        },
        method,
        header: {
          "Content-Type": "application/json",
          "x-client-key": encryptPublicKeyWithServerRSA,
          "x-supports-gzip": "true",
          Authorization: `Bearer ${accessToken}`,
          platform: "mp-weixin",
          ...headers,
        },
        success: async (res: any) => {
          if (res.data?.code === 0) {
            const compressed = res.data.compressed;
            const decryptData = decryptWithAESCBC(
              {
                key: encryptKey,
                ciphertext: res.data?.data,
              },
              compressed
            );
            resolve({
              ...res.data,
              data: decryptData,
            });
          } else if (res.data?.code === 401) {
            // AccessToken 失效，刷新token
            try {
              const newToken = await refreshAccessToken();
              // 使用新 token 重试请求
              const retryResult: any = await request({
                ...options,
                headers: {
                  ...options.headers,
                  Authorization: `Bearer ${newToken}`,
                },
              });
              resolve(retryResult);
            } catch (error) {
              reject(error);
            }
          } else if (res.data?.code === 400) {
            // 登录失效，重新登录
            try {
              const newToken = await wxloginGetBothToken();
              // 使用新 token 重试请求
              const retryResult: any = await request({
                ...options,
                headers: {
                  ...options.headers,
                  Authorization: `Bearer ${newToken}`,
                },
              });
              resolve(retryResult);
            } catch (error) {
              reject(error);
            }
          } else {
            wx.showToast({
              title: res.data.msg,
              icon: "none",
              duration: 3000,
            });
            resolve(res.data);
          }
        },
        fail: (err) => {
          if (err.errMsg === "request:fail abort") {
            return;
          }
          reject(err);
        },
        complete: () => {
          if (requestTasks[requestKey] === task) {
            delete requestTasks[requestKey];
          }
        },
      });

      requestTasks[requestKey] = task;
    });
  } catch (error) {
    console.log("请求出错:", error);
    throw error;
  }
};

// 普通请求
export const requestNormal = async <T>(options: {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
  data?: any;
  headers?: any;
}): Promise<WxResponse<T>> => {
  try {
    const { url, data, method, headers } = options;
    // 生成请求的唯一标识
    const requestKey = `${method}:${url}`;
    // 如果存在旧的请求，取消它
    if (requestTasks[requestKey]) {
      requestTasks[requestKey].abort();
    }
    return new Promise(async (resolve, reject) => {
      const task = wx.request({
        enableHttp2: true,
        url: BASE_URL + url,
        data: data,
        method,
        header: {
          "Content-Type": "application/json",
          platform: "mp-weixin",
          ...headers,
        },
        success: async (res: any) => {
          resolve(res.data);
        },
        fail: (err) => {
          if (err.errMsg === "request:fail abort") {
            return;
          }
          reject(err);
        },
        complete: () => {
          if (requestTasks[requestKey] === task) {
            delete requestTasks[requestKey];
          }
        },
      });
      requestTasks[requestKey] = task;
    });
  } catch (error) {
    console.log("请求出错:", error);
    throw error;
  }
};
