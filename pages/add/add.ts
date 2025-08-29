import { BASE_URL } from "../../constants/common";
import { request } from "../../utils/http";
import { storage } from "../../utils/storage";

// pages/add/add.ts

interface PicItem {
  previewUrl: string;
  serverFilename: string;
  originalIndex?: number; // 新增
}

interface CompressedFile {
  tempFilePath: string;
  size: number;
  [key: string]: any;
}

Page({
  data: {
    id: "",
    mode: "add",
    isLoading: false,
    name: "",
    intro: "",
    is_charged: null as string | null,
    hasToilet: null as boolean | null,
    hasWater: null as boolean | null,
    hasElectricity: null as boolean | null,
    canPitchTent: null as boolean | null,
    // 是否为营地（单选）
    isCamp: true as boolean | null, // true: 是营地, false: 不是营地
    // 便利设施（单选，仅当不是营地时显示）
    facility: "", // 便利设施：supermarket, toilet, market, nightMarket
    // 营地类型（单选，仅当是营地时显示）
    campType: "", // 营地类型：parkingLot, serviceArea, campground, rvPark
    // 活动选项（多选）
    canFishing: false, // 是否可以钓鱼
    canFire: false, // 是否可以明火
    latitude: "",
    longitude: "",
    address: "",
    pics: [] as any[],
    uploadProgress: {
      total: 0,
      finished: 0,
      show: false,
    },
    userHasInteracted: false, // 用户是否已开始操作
  },

  // 自动保存相关方法
  // 保存数据到localStorage
  saveToLocalStorage() {
    // 如果用户还没有开始操作，不保存
    if (!this.data.userHasInteracted) {
      return;
    }

    // 检查是否有实际内容，避免保存空数据
    const hasContent = this.hasActualContent();
    if (!hasContent) {
      // 如果没有实际内容，清除可能存在的草稿
      this.clearLocalStorage();
      return;
    }

    const saveData = {
      name: this.data.name,
      intro: this.data.intro,
      is_charged: this.data.is_charged,
      hasToilet: this.data.hasToilet,
      hasWater: this.data.hasWater,
      hasElectricity: this.data.hasElectricity,
      canPitchTent: this.data.canPitchTent,
      isCamp: this.data.isCamp,
      facility: this.data.facility,
      campType: this.data.campType,
      canFishing: this.data.canFishing,
      canFire: this.data.canFire,
      latitude: this.data.latitude,
      longitude: this.data.longitude,
      address: this.data.address,
      pics: this.data.pics,
      timestamp: Date.now(),
    };

    try {
      storage.setItem("add_form_draft", saveData);
    } catch (error) {
      console.log("保存草稿失败:", error);
    }
  },

  // 检查是否有实际内容
  hasActualContent() {
    const {
      name,
      intro,
      latitude,
      longitude,
      pics,
      isCamp,
      facility,
      campType,
    } = this.data;

    // 检查基本信息
    if (name && name.trim()) return true;
    if (intro && intro.trim()) return true;
    if (latitude && longitude) return true;
    if (pics && pics.length > 0) return true;

    // 检查营地相关选项
    if (isCamp === true) {
      // 是营地模式，检查营地相关字段
      if (campType && campType.trim()) return true;
      if (this.data.is_charged !== null) return true;
      if (this.data.hasToilet !== null) return true;
      if (this.data.hasWater !== null) return true;
      if (this.data.hasElectricity !== null) return true;
      if (this.data.canPitchTent !== null) return true;
      if (this.data.canFishing) return true;
      if (this.data.canFire) return true;
    } else if (isCamp === false) {
      // 不是营地模式，检查便利设施
      if (facility && facility.trim()) return true;
    }

    return false;
  },

  // 从localStorage恢复数据
  loadFromLocalStorage() {
    try {
      const savedData = storage.getItem("add_form_draft");
      if (savedData && savedData.timestamp) {
        // 检查草稿是否在24小时内
        const isExpired =
          Date.now() - savedData.timestamp > 24 * 60 * 60 * 1000;
        if (isExpired) {
          tt.removeStorageSync("add_form_draft");
          return false;
        }

        // 恢复数据
        this.setData({
          name: savedData.name || "",
          intro: savedData.intro || "",
          is_charged: savedData.is_charged,
          hasToilet: savedData.hasToilet,
          hasWater: savedData.hasWater,
          hasElectricity: savedData.hasElectricity,
          canPitchTent: savedData.canPitchTent,
          isCamp: savedData.isCamp,
          facility: savedData.facility || "",
          campType: savedData.campType || "",
          canFishing: savedData.canFishing || false,
          canFire: savedData.canFire || false,
          latitude: savedData.latitude || "",
          longitude: savedData.longitude || "",
          address: savedData.address || "",
          pics: savedData.pics || [],
          userHasInteracted: true, // 恢复草稿说明用户之前已操作过
        });

        return true;
      }
    } catch (error) {
      console.error("加载草稿失败:", error);
    }
    return false;
  },

  // 清除localStorage中的草稿
  clearLocalStorage() {
    try {
      tt.removeStorageSync("add_form_draft");
    } catch (error) {
      console.error("清除草稿失败:", error);
    }
  },

  // 防抖保存
  debouncedSave: null as any,

  // 触发保存
  triggerSave() {
    if (this.debouncedSave) {
      clearTimeout(this.debouncedSave);
    }
    this.debouncedSave = setTimeout(() => {
      this.saveToLocalStorage();
    }, 1000); // 1秒防抖
  },

  onLoad(options: any) {
    if (options.mode === "edit" && options.id) {
      this.setData({
        mode: "edit",
        id: options.id,
      });
      this.fetchSpotDetail(options.id);
      tt.setNavigationBarTitle({
        title: "修改营地信息",
      });
    } else {
      // 新增模式，尝试恢复草稿
      const hasDraft = this.loadFromLocalStorage();
      if (hasDraft) {
        tt.showModal({
          title: "发现草稿",
          content: "检测到您有未完成的表单，是否恢复？",
          confirmText: "恢复",
          cancelText: "重新开始",
          success: (res: any) => {
            if (!res.confirm) {
              // 用户选择重新开始，清除草稿
              this.clearLocalStorage();
              this.setData({
                name: "",
                intro: "",
                is_charged: null,
                hasToilet: null,
                hasWater: null,
                hasElectricity: null,
                canPitchTent: null,
                isCamp: true,
                facility: "",
                campType: "",
                canFishing: false,
                canFire: false,
                latitude: "",
                longitude: "",
                address: "",
                pics: [],
              });
            }
          },
        });
      }
    }
  },

  async fetchSpotDetail(id: string) {
    try {
      this.setData({
        isLoading: true,
      });
      const res = await request<any>({
        url: "/api/parking_spots/detail",
        method: "GET",
        data: {
          id,
        },
      });

      if (res.code === 0) {
        const spot = res.data;
        const {
          is_charged,
          hasToilet,
          hasWater,
          hasElectricity,
          canPitchTent,
          isCamp,
          facility,
          campType,
          canFishing,
          canFire,
        } = spot;
        this.setData({
          name: spot.name,
          intro: spot.description || spot.introduction || "",
          is_charged: is_charged ? "1" : "0",
          hasToilet,
          hasWater,
          hasElectricity,
          canPitchTent,
          isCamp: isCamp !== undefined ? isCamp : null,
          facility: facility || "",
          campType: campType || "",
          canFishing: canFishing || false,
          canFire: canFire || false,
          latitude: spot.latitude,
          longitude: spot.longitude,
          address: spot.address,
          pics: spot.images,
        });
      } else {
        tt.showToast({
          title: "获取营地信息失败",
          icon: "error",
        });
      }
    } catch (error) {
      tt.showToast({
        title: "获取营地信息失败",
        icon: "error",
      });
    } finally {
      this.setData({
        isLoading: false,
      });
    }
  },

  // 设置收费选项
  setFeeOption(e: any) {
    const is_charged = e.currentTarget.dataset.fee;
    this.setData({
      is_charged,
    });
    this.triggerSave();
  },

  // 设置是否为营地
  setIsCamp(e: any) {
    const isCamp = e.currentTarget.dataset.iscamp === "1";
    if (isCamp !== this.data.isCamp) {
      this.setData({
        isCamp,
        // 当选择不是营地时，清空营地相关字段
        facility: isCamp ? "" : this.data.facility,
        campType: isCamp ? this.data.campType : "",
        name: "",
      });
      this.triggerSave();
    }
  },

  setToiletOption(e: any) {
    const hasToilet = +e.currentTarget.dataset.option === 1;
    this.setData({
      hasToilet,
    });
    this.triggerSave();
  },

  setWaterOption(e: any) {
    const hasWater = +e.currentTarget.dataset.option === 1;
    this.setData({
      hasWater,
    });
    this.triggerSave();
  },

  setElectricityOption(e: any) {
    const hasElectricity = +e.currentTarget.dataset.option === 1;
    this.setData({
      hasElectricity,
    });
    this.triggerSave();
  },

  setTentOption(e: any) {
    const canPitchTent = +e.currentTarget.dataset.option === 1;
    this.setData({
      canPitchTent,
    });
    this.triggerSave();
  },

  // 便利设施选项处理方法
  setFacility(e: any) {
    const facility = e.currentTarget.dataset.type;
    this.setData({
      facility,
    });
    this.triggerSave();
  },

  // 营地类型选项处理方法
  setCampType(e: any) {
    const campType = e.currentTarget.dataset.type;
    this.setData({
      campType,
    });
    this.triggerSave();
  },

  // 活动选项处理方法
  setFishingOption(e: any) {
    this.setData({
      canFishing: !this.data.canFishing,
    });
    this.triggerSave();
  },

  setFireOption(e: any) {
    this.setData({
      canFire: !this.data.canFire,
    });
    this.triggerSave();
  },

  // 输入框事件处理
  onNameInput(e: any) {
    this.setData({
      name: e.detail.value,
    });
    this.triggerSave();
  },

  onIntroInput(e: any) {
    this.setData({
      intro: e.detail.value,
    });
    this.triggerSave();
  },

  // 选择位置
  chooseLocation() {
    tt.chooseLocation({
      success: (res: any) => {
        const { name, latitude, longitude, address } = res || {};
        this.setData({
          latitude: Number(latitude),
          longitude: Number(longitude),
          address: name ? `${name}-${address}` : address,
        });

        if (!this.data.name) {
          this.setData({
            name,
          });
        }
        this.triggerSave();
      },
    });
  },

  // 选择图片
  chooseImage() {
    tt.chooseImage({
      count: 9 - this.data.pics.length,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const startIndex = this.data.pics.length;
        // 为每个文件分配 originalIndex
        const tempFiles = res.tempFiles.map((file, idx) => ({
          ...file,
          originalIndex: startIndex + idx,
        }));
        tt.showLoading({
          title: "处理中...",
          mask: true,
        });

        // 压缩图片
        const compressPromises = tempFiles.map((file) => {
          return new Promise<CompressedFile>((resolve, reject) => {
            const compressWithQuality = (quality: number) => {
              return new Promise<CompressedFile>((resolve, reject) => {
                tt.compressImage({
                  src: file.path,
                  quality,
                  success: (res) => {
                    tt.getFileInfo({
                      filePath: res.tempFilePath,
                      success: (fileInfo) => {
                        if (fileInfo.size > 300 * 1024 && quality > 15) {
                          compressWithQuality(quality - 15)
                            .then(resolve)
                            .catch(reject);
                        } else {
                          resolve({
                            ...file,
                            tempFilePath: res.tempFilePath,
                            originalIndex: file.originalIndex,
                          });
                        }
                      },
                      fail: () => {
                        resolve({
                          ...file,
                          tempFilePath: res.tempFilePath,
                          originalIndex: file.originalIndex,
                        });
                      },
                    });
                  },
                  fail: (error) => {
                    console.error("压缩失败:", error);
                    resolve({ ...file, originalIndex: file.originalIndex });
                  },
                });
              });
            };
            compressWithQuality(35).then(resolve).catch(reject);
          });
        });

        Promise.all(compressPromises)
          .then((compressedFiles) => {
            tt.hideLoading();
            this.setData({
              uploadProgress: {
                total: compressedFiles.length,
                finished: 0,
                show: true,
              },
            });
            // 上传任务
            const uploadFile = (
              file: CompressedFile,
              index: number
            ): Promise<PicItem> => {
              return new Promise((resolve, reject) => {
                let retryCount = 0;
                const maxRetries = 2;
                let uploadTask: WechatMiniprogram.UploadTask | null = null;
                let isRetrying = false;
                let uploadStartTime = 0;
                let timeoutTimer: any = null;
                const doRetry = (reason: string) => {
                  retryCount++;
                  isRetrying = true;
                  if (retryCount <= maxRetries) {
                    tt.showToast({
                      title: `第${index + 1}张重试第${retryCount}次`,
                      icon: "none",
                      duration: 1000,
                    });
                    setTimeout(upload, retryCount * 1000);
                  } else {
                    reject(
                      new Error(
                        `第${
                          index + 1
                        }张上传失败，已重试${maxRetries}次。原因: ${reason}`
                      )
                    );
                  }
                };
                const upload = () => {
                  if (timeoutTimer) clearTimeout(timeoutTimer);
                  uploadStartTime = Date.now();
                  uploadTask = tt.uploadFile({
                    url: BASE_URL + "/api/fs-service/uploadFileToOSS",
                    filePath: file.tempFilePath,
                    name: "files",
                    header: {
                      enctype: "multipart/form-data",
                    },
                    success: (res) => {
                      if (timeoutTimer) clearTimeout(timeoutTimer);
                      try {
                        const data = res.data;
                        const jsonData = JSON.parse(data);
                        if (jsonData.code === 0) {
                          const serverFile = jsonData.data.files[0];
                          resolve({
                            previewUrl: file.tempFilePath,
                            serverFilename: serverFile.filename,
                            originalIndex: file.originalIndex,
                          });
                        } else {
                          doRetry(jsonData.msg || "服务器返回错误");
                        }
                      } catch (error: any) {
                        doRetry(error.message || "解析响应失败");
                      }
                    },
                    fail: (e) => {
                      if (timeoutTimer) clearTimeout(timeoutTimer);
                      doRetry(e.errMsg || "网络错误");
                    },
                  });
                  timeoutTimer = setTimeout(() => {
                    if (uploadTask) uploadTask.abort();
                    doRetry("上传超时");
                  }, 30000 + retryCount * 5000);
                };
                upload();
              });
            };
            // 并发上传所有图片
            const uploadPromises = compressedFiles.map((file, i) =>
              uploadFile(file, i).then(
                (result) => {
                  // 实时插入到 pics 的 originalIndex 位置
                  const newPics = [...this.data.pics];
                  if (typeof result.originalIndex === "number") {
                    newPics[result.originalIndex] = {
                      serverFilename: result.serverFilename,
                      previewUrl: result.previewUrl,
                      originalIndex: result.originalIndex,
                    };
                  }
                  this.setData({
                    pics: newPics,
                    uploadProgress: {
                      ...this.data.uploadProgress,
                      finished: this.data.uploadProgress.finished + 1,
                    },
                  });
                  return { success: true, result };
                },
                (error) => {
                  this.setData({
                    uploadProgress: {
                      ...this.data.uploadProgress,
                      finished: this.data.uploadProgress.finished + 1,
                    },
                  });
                  return { success: false, error };
                }
              )
            );
            Promise.all(uploadPromises)
              .then((results) => {
                // 上传全部完成后，统一排序
                function isSuccessResult(
                  r: any
                ): r is {
                  success: true;
                  result: PicItem & { originalIndex: number };
                } {
                  return r.success && !!r.result;
                }
                const failedCount = results.filter((r) => !r.success).length;
                // 过滤成功的，合并已有的 pics
                let allPics = this.data.pics.filter(Boolean);
                // 排序
                allPics = allPics.sort(
                  (a, b) => (a.originalIndex || 0) - (b.originalIndex || 0)
                );
                this.setData({
                  pics: allPics,
                  uploadProgress: {
                    ...this.data.uploadProgress,
                    show: false,
                  },
                });
                this.triggerSave();

                if (failedCount > 0) {
                  tt.showToast({
                    title: `${failedCount}张图片上传失败`,
                    icon: "error",
                    duration: 2000,
                  });
                } else {
                  tt.showToast({
                    title: "上传成功",
                    icon: "success",
                    duration: 2000,
                  });
                }
              })
              .catch((error) => {
                this.setData({
                  uploadProgress: {
                    ...this.data.uploadProgress,
                    show: false,
                  },
                });
                tt.showToast({
                  title: error.message || "上传失败",
                  icon: "error",
                  duration: 2000,
                });
              });
          })
          .catch((error) => {
            tt.hideLoading();
            tt.showToast({
              title: "图片处理失败",
              icon: "error",
              duration: 2000,
            });
          });
      },
      fail: (error) => {
        tt.showToast({
          title: error.errMsg || "选择图片失败",
          icon: "error",
          duration: 2000,
        });
      },
    });
  },

  // 删除图片
  deleteImage(e: any) {
    const index = e.currentTarget.dataset.index;
    const pics = this.data.pics;
    pics.splice(index, 1);
    this.setData({
      pics: pics,
    });
    this.triggerSave();
  },

  // 图片左移
  moveImageLeft(e: any) {
    const index = e.currentTarget.dataset.index;
    if (index > 0) {
      const pics = [...this.data.pics];
      [pics[index - 1], pics[index]] = [pics[index], pics[index - 1]];
      this.setData({ pics });
      tt.showToast({ icon: "none", title: "图片往前移动" });
      this.triggerSave();
    }
  },

  // 图片右移
  moveImageRight(e: any) {
    const index = e.currentTarget.dataset.index;
    const pics = [...this.data.pics];
    [pics[index], pics[index + 1]] = [pics[index + 1], pics[index]];
    this.setData({ pics });
    tt.showToast({ icon: "none", title: "图片往后移动" });
    this.triggerSave();
  },

  async submitForm() {
    const {
      id,
      name,
      intro,
      latitude,
      longitude,
      pics,
      is_charged,
      hasToilet,
      hasWater,
      hasElectricity,
      canPitchTent,
      isCamp,
      facility,
      campType,
      canFishing,
      canFire,
      address,
    } = this.data;
    if (!this.validateForm()) return;
    tt.showLoading({ title: "提交中..." });

    let res: any = {};
    const commonData = {
      name,
      intro,
      latitude,
      longitude,
      pics: pics?.map((pic) => pic.serverFilename) || [],
      is_charged,
      hasToilet,
      hasWater,
      hasElectricity,
      canPitchTent,
      isCamp,
      facility,
      campType,
      canFishing,
      canFire,
      address,
    };
    if (this.data.mode === "edit") {
      res = await request({
        url: "/api/parking_spots/update_new",
        method: "POST",
        data: {
          id,
          ...commonData,
        },
      });
    } else {
      res = await request({
        url: "/api/parking_spots/add_new",
        method: "POST",
        data: commonData,
      });
    }
    tt.hideLoading();
    if (res.code === 0) {
      // 提交成功后清除草稿
      this.clearLocalStorage();
      tt.showToast({
        title: res.msg,
        icon: "none",
        duration: 3000,
        success: () => {
          // 返回上一页
          setTimeout(() => {
            tt.navigateBack();
          }, 3000);
        },
      });
    }
  },

  validateForm() {
    if (!this.data.latitude || !this.data.longitude) {
      tt.showToast({
        title: "请选择位置",
        icon: "none",
      });
      return false;
    }

    if (this.data.isCamp === null) {
      tt.showToast({ title: "请选择是否为营地", icon: "none" });
      return false;
    }

    // 如果不是营地，需要选择便利设施
    if (this.data.isCamp === false && this.data.facility === "") {
      tt.showToast({ title: "请选择便利设施", icon: "none" });
      return false;
    }

    if (!this.data.name.trim()) {
      tt.showToast({
        title: "请输入名称",
        icon: "none",
      });
      return false;
    }
    if (!this.data.intro.trim()) {
      tt.showToast({
        title: "请输入介绍",
        icon: "none",
      });
      return false;
    }

    // 如果是营地，验证营地相关字段
    if (this.data.isCamp === true) {
      if (!this.data.campType) {
        tt.showToast({ title: "请选择营地类型", icon: "none" });
        return false;
      }
      if (this.data.is_charged === null) {
        tt.showToast({ title: "请选择是否收费", icon: "none" });
        return false;
      }

      if (this.data.hasToilet === null) {
        tt.showToast({ title: "请选择是否有厕所", icon: "none" });
        return false;
      }

      if (this.data.hasWater === null) {
        tt.showToast({ title: "请选择是否可以接水", icon: "none" });
        return false;
      }

      if (this.data.hasElectricity === null) {
        tt.showToast({ title: "请选择是否有充电桩", icon: "none" });
        return false;
      }

      if (this.data.canPitchTent === null) {
        tt.showToast({ title: "请选择是否可以搭帐篷", icon: "none" });
        return false;
      }
    }

    if (this.data.pics.length === 0) {
      tt.showToast({
        title: "请上传至少一张图片",
        icon: "none",
      });
      return false;
    }
    return true;
  },

  // 页面显示时记录用户已开始操作
  onShow() {
    // 标记用户已开始操作，避免刚进入就保存空数据
    this.setData({
      userHasInteracted: true,
    });
  },
});
