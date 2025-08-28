import { APP_AES_PUBLIC_KEY, BASE_URL } from "../constants/common";
import { decryptWithAESCBC } from "./crypto";
import { formatDate } from "./util";
import { request, requestNormal } from './http';
import { storage } from "./storage";

export const getServerKeyExchangeApi = async () => {
  try {
    const res = await requestNormal({
      url: "/api/auth/getExchangeKey",
      method: "GET",
      data: {
        id: Math.random(),
      }
    });

    if (res.code === 0) {
      const data = decryptWithAESCBC({
        key: APP_AES_PUBLIC_KEY,
        ciphertext: res.data,
      });
      // 从响应中获取有效期（单位：秒），如果没有则使用默认值（例如7天）
      const ttl = data.expireTime || 7 * 24 * 60 * 60; // 默认7天
      const cached = {
        value: data.publicKey,
        expireAt: Date.now() + ttl * 1000
      }
      return cached;
    }

    return null


  } catch (e) {
    tt.showModal({
      title: '提示',
      content: "初始化失败，请在小程序右上角 -> 点击三个点菜单按钮 -> 点击重新进入小程序",
      icon: "none",
    });
    return null
  }
}

export const getUserInfo = async () => {
  try {
    // 获取用户信息
    const res = await request<any>({
      url: `/api/users/userInfo`,
      method: "GET"
    })

    if (res.code === 0) {
      const userInfo = res.data
      const membershipExpiresAt = userInfo.membershipExpiresAt ? formatDate(new Date(userInfo.membershipExpiresAt)) : '';
      const newUserInfo = {
        ...userInfo,
        membershipExpiresAt
      }
      storage.setItem('userInfo', newUserInfo)
      return newUserInfo;
    }

    return {
      nickname: "",
      isVip: false,
    }

  } catch (error) {
    console.error('获取用户信息/api/users/userInfo', error)
  }
}