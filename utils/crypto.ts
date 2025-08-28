/**
 * 微信小程序 AES 加密工具（支持随机密钥生成）
 */
import CryptoJS from "crypto-js";
import JSEncrypt from "./jsencrypt.min.js";
import pako from "pako";
/**
 * 安全随机数生成器（使用 Math.random()）
 */
const secureRandom = (length: number): CryptoJS.lib.WordArray => {
  const words: number[] = [];
  for (let i = 0; i < length; i++) {
    // 生成 0-255 之间的随机数
    const randomByte = Math.floor(Math.random() * 256);
    words[i >>> 2] |= (randomByte & 0xff) << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, length);
};

/**
 * 生成随机 AES 密钥（32 字节）
 * @returns {string} - Base64 编码的密钥
 */
export const generateRandomKey = (): string => {
  // 直接生成 32 字节的随机密钥
  const key = secureRandom(32);
  return key.toString(CryptoJS.enc.Base64);
};

/**
 * 生成随机 IV（初始化向量）
 * @returns {string} - Hex 编码的 IV
 */
export const generateRandomIV = (): string => {
  // 直接生成 16 字节的 IV
  const iv = secureRandom(16);
  // 使用 Hex 编码，输出长度为 32 个字符（16 字节）
  return iv.toString(CryptoJS.enc.Hex);
};

/**
 * AES-CBC 加密（兼容性更好）
 * @param {string} plaintext - 明文数据
 * @param {string} key - Base64 编码的密钥
 * @param {string} iv - Base64 编码的 IV（可选，若未提供则从密钥截取）
 * @returns {EncryptedData} - 加密结果
 */
export const encryptWithAESCBC = (
  plaintext: string,
  key: string,
  iv?: string
) => {
  // 转换密钥格式
  const keyWordArray = CryptoJS.enc.Base64.parse(key);

  // 处理 IV（若无则从密钥截取）
  let ivWordArray;
  if (iv) {
    ivWordArray = CryptoJS.enc.Base64.parse(iv);
  } else {
    // 从密钥中截取前 16 字节作为 IV
    ivWordArray = CryptoJS.lib.WordArray.create(keyWordArray.words.slice(0, 4));
    iv = ivWordArray.toString(CryptoJS.enc.Base64);
  }

  // 将明文转换为 UTF-8 编码的 WordArray
  const plaintextWordArray = CryptoJS.enc.Utf8.parse(plaintext);

  // 执行加密
  const encrypted = CryptoJS.AES.encrypt(plaintextWordArray, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // 确保返回 Base64 编码的密文
  const ciphertext = encrypted.toString();

  return {
    key,
    iv,
    ciphertext,
    mode: "AES-CBC",
  };
};

/**
 * AES-CBC 解密
 * @param {EncryptedData} encryptedData - 加密数据
 * @returns {string} - 解密后的明文
 */
export const decryptWithAESCBC = (encryptedData: {
  key: string;
  ciphertext: string | any;
  iv?: string;
}, compressed = false) => {
  try {
    // 转换格式
    const keyWordArray = CryptoJS.enc.Base64.parse(encryptedData.key);
    // 处理 IV（若无则从密钥截取）
    let ivWordArray;
    if (encryptedData.iv) {
      ivWordArray = CryptoJS.enc.Base64.parse(encryptedData.iv);
    } else {
      // 从密钥中截取前 16 字节作为 IV
      ivWordArray = CryptoJS.lib.WordArray.create(
        keyWordArray.words.slice(0, 4)
      );
    }

    // 确保密文是字符串类型
    let ciphertext = encryptedData.ciphertext;
    if (typeof ciphertext !== "string") {
      if (typeof ciphertext === "object" && ciphertext !== null) {
        // 如果是对象，尝试转换为字符串
        ciphertext = JSON.stringify(ciphertext);
      } else {
        // 其他情况，转换为字符串
        ciphertext = String(ciphertext);
      }
    }

    // 确保密文是 Base64 格式
    ciphertext = ciphertext.replace(/[^A-Za-z0-9+/=]/g, "");

    // 执行解密
    const decrypted = CryptoJS.AES.decrypt(ciphertext, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // 尝试解码为 UTF-8
    let decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr || decryptedStr.length === 0) {
      console.error("AES 解密失败: decryptedStr 为空");
      return null
    }
    if (compressed) {
      try {
        // 将 Base64 字符串转换为 Uint8Array
        const compressedData = CryptoJS.enc.Base64.parse(decryptedStr);
        const uint8Array = new Uint8Array(compressedData.words.length * 4);
        // 将 WordArray 转换为 Uint8Array
        for (let i = 0; i < compressedData.words.length; i++) {
          const word = compressedData.words[i];
          uint8Array[i * 4] = (word >>> 24) & 0xff;
          uint8Array[i * 4 + 1] = (word >>> 16) & 0xff;
          uint8Array[i * 4 + 2] = (word >>> 8) & 0xff;
          uint8Array[i * 4 + 3] = word & 0xff;
        }
        // 截取到实际长度
        const actualLength = compressedData.sigBytes;
        const finalArray = uint8Array.slice(0, actualLength);

        // 使用 pako 解压缩 gzip 数据
        const decompressedData = pako.inflate(finalArray, { to: 'string' });
        decryptedStr = decompressedData;
      } catch (error) {
        console.error('解压缩失败:', error);
        throw new Error('解压缩失败: ' + (error as Error).message);
      }
    }
    // 验证解密结果是否为有效的 JSON 字符串
    try {
      return JSON.parse(decryptedStr);
    } catch (e) {
      console.error("解密结果不是有效的 JSON 字符串:", e);
      throw new Error("解密结果格式错误");
    }
  } catch (error) {
    console.error("AES 解密失败:", error);
    throw new Error("解密失败: " + (error as Error).message);
  }
};


// 微信小程序兼容的 RSA 加密函数
export const encryptDataWithServerRSA = (
  plaintext: string,
  publicKeyPem: any
) => {
  // RSA 加密
  const rsa = new JSEncrypt();
  rsa.setPublicKey(publicKeyPem);
  // 加密数据
  const encrypted = rsa.encrypt(plaintext);
  return encrypted;
};
