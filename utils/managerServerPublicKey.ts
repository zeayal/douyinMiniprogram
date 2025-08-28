import { getServerKeyExchangeApi } from "./api";
import { storage } from "./storage";

const S_PUBLIC_KEY = "S_PUBLIC_KEY";

let memoryCachePublicKeyInfo: { value: string; expireAt: number } | undefined;

const setServerPublicKey = (cached: { value: string; expireAt: number }) => {
  memoryCachePublicKeyInfo = cached;
  storage.setItem(S_PUBLIC_KEY, JSON.stringify(cached));
};

const getServerPublicKey = async () => {
  try {
    // 1.先从内存中加载
    if (
      memoryCachePublicKeyInfo &&
      memoryCachePublicKeyInfo.value &&
      memoryCachePublicKeyInfo.expireAt > Date.now()
    ) {
      return memoryCachePublicKeyInfo.value; // 公钥有效
    }

    const cachedJSONStr: any = await storage.getItemAsync(S_PUBLIC_KEY);
    if (cachedJSONStr) {
      const cached = JSON.parse(cachedJSONStr);
      if (cached && cached.expireAt && cached.expireAt > Date.now()) {
        return cached.value; // 公钥有效
      }
    }
    const serverPublicKey = await getServerKey();
    return serverPublicKey;
  } catch (e) {
    console.log("getServerPublicKey e", e);
    const serverPublicKey = await getServerKey();
    return serverPublicKey;
  }
};

const getServerKey = async () => {
  const cached = await getServerKeyExchangeApi();
  if (cached) {
    setServerPublicKey(cached);
  }
  return cached?.value;
};


export {
    getServerPublicKey
}