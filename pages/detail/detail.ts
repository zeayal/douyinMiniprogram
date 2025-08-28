// pages/detail/detail.ts
import { getDistanceInfo, getLocationAsync, navigationToLocation } from "../../utils/gps";
import { request } from "../../utils/http";
import { formatTime } from "../../utils/util";
import { isSinglePageMode } from "../../utils/device";

interface CheckinResponse {
  parking_spot_id: number;
  data: any;
  msg: string;
}

interface CollectionResponse {
  code: number;
  msg: string;
  data?: any;
}

interface SpotDetail {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
  scoreNumber: number;
  navigationCount: number;
  viewCount: number;
  isCharged: boolean;
  hasToilet: boolean;
  hasWater: boolean;
  hasElectricity: boolean;
  canPitchTent: boolean;
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoading: true,
    isLoadingDistance: true,
    tip: '', // 滚动提示，服务端获取
    scrollDuration: 30,
    parking_spot_id: "",
    detail: {} as SpotDetail,
    directDistance: null as null | {
      meters: number;
      kilometers: number;
      formatted: string | null;
    },
    checkInList: [] as any[],
    showModal: false,
    checkinContent: "",
    maxLength: 200,
    isCollected: false, // 收藏状态
    selectedRating: 0, // 星级评分，0表示未选择
    stars: [1, 2, 3, 4, 5], // 星星数组
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    try {
      // 正常模式下执行完整流程
      const parking_spot_id = options.id;
      this.setData({
        parking_spot_id,
      });
      await this.fetchDetail(parking_spot_id);
      this.checkCollectionStatus(parking_spot_id); // 检查收藏状态
      this.fetchCheckIns(parking_spot_id);
      this.fetchTip();

      // SEO优化：动态设置页面标题
      this.setPageTitle();
    } catch (e) {
      console.error('detail onLoad error', e);
    } finally {
      // 检查是否处于单页模式（朋友圈分享场景）
      const isInSinglePageMode = isSinglePageMode();
      if (isInSinglePageMode) {
        // 延迟显示提示，避免影响页面加载
        tt.showModal({
          title: '提示',
          content: '点击下方前往小程序使用完整功能',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    }
  },

  /**
   * SEO优化：动态设置页面标题
   */
  setPageTitle() {
    const detail = this.data.detail;
    if (detail && detail.name) {
      const title = `${detail.name} - ${detail.isCharged ? '收费' : '免费'}露营地 | 户外露营、房车营地、自驾攻略`;
      tt.setNavigationBarTitle({
        title: title
      });
    }
  },

  /**
   * 用户点击右上角分享 - 发送给朋友
   */
  onShareAppMessage() {
    return {
      title: '好友分享了一个绝佳露营地点：' + this.data.detail.name + '，点击查看',
      path: `pages/detail/detail?id=${this.data.parking_spot_id}&source=mp_wechat_pages_detail_onShareAppMessage`
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '好友分享了一个绝佳露营地点：' + this.data.detail.name + '，点击查看',
    }
  },

  async fetchTip() {
    try {
      const res = await request<any>({
        url: `/api/parking_spots/getTip`,
        method: "GET",
        data: {},
      });
      if (res.code === 0) {
        this.setData({
          tip: res.data.tip,
          scrollDuration: res.data.speed,
        })
      }

    } catch (e) {
      console.error('getTip error', e);
    }

  },
  async fetchDetail(parking_spot_id: string) {
    try {
      this.setData({ isLoading: true })
      const res = await request<any>({
        url: `/api/parking_spots/campDetail`,
        method: "GET",
        data: {
          id: parking_spot_id,
        },
      });

      if (res.code === 0) {
        const detail = res.data;
        this.setData({
          detail,
        });
        const { latitude, longitude } = detail
        this.getDistance({
          latitude,
          longitude
        });
      }
    } finally {
      this.setData({ isLoading: false })
    }
  },
  async fetchCheckIns(detailId: string) {
    try {
      const res = await request({
        url: "/api/parking_spots/campCheckIns",
        method: "GET",
        data: {
          id: detailId
        },
      });
      if (res.code === 0 && Array.isArray(res.data)) {
        const checkInList = res.data.map(item => {
          return {
            ...item,
            checkInTime: formatTime(new Date(item.checkInTime)),
          }
        })
        this.setData({ checkInList })
      }
    } catch (e) {
      console.log('fetchCheckIns', e)
    } finally {

    }
  },

  nav() {
    const { parking_spot_id } = this.data;
    const { longitude, latitude, name } = this.data.detail;
    navigationToLocation({ longitude, latitude, name })
    request<any>({
      url: `/api/parking_spots/navigation`,
      method: "POST",
      data: {
        id: parking_spot_id,
      },
    });
  },

  // 打开打卡弹框
  async showCheckinModal() {
    try {
      let directDistance = this.data.directDistance;
      const isLoadingDistance = this.data.isLoadingDistance;
      // 判断是否在1公里范围内
      if (isLoadingDistance === true) {
        tt.showToast({
          title: `距离计算中，暂时无法在该地点打卡`,
          icon: "none",
          duration: 3000,
        });
        return
      }
      if (directDistance == null) {
        // 为获取到定位权限，提示用户
        tt.showToast({
          title: `请在小程序设置中允许获取当前位置信息`,
          icon: "none",
          duration: 3000,
        });
      } else if (directDistance.kilometers <= 20) {
        // 在范围内，可以打卡
        this.setData({
          showModal: true,
          checkinContent: "",
          selectedRating: 0, // 重置评分
        }); // 执行打卡逻辑
      } else {
        // 不在范围内，提示用户
        tt.showToast({
          title: `距离该地点${directDistance.formatted}，1公里范围才可打卡`,
          icon: "none",
          duration: 3000,
        });
      }
    } catch (e) {
      tt.showToast({
        title: `暂时无法打卡`,
        icon: "none",
        duration: 3000,
      });
    }


  },

  async getDistance(currentSiteDetailLocation: {
    longitude: number;
    latitude: number
  }) {

    try {
      const res = await getLocationAsync();
      const { latitude, longitude } = res; // 用户当前精确定位
      // 计算距离（公里）
      const directDistance = getDistanceInfo(
        latitude,
        longitude,
        currentSiteDetailLocation.latitude,
        currentSiteDetailLocation.longitude
      );

      // 添加距离到详情数据
      this.setData({
        directDistance,
        isLoadingDistance: false
      })

    } catch (e) {
      this.setData({
        directDistance: null,
        isLoadingDistance: false
      })
    }
  },

  // 关闭打卡弹框
  hideCheckinModal() {
    this.setData({
      showModal: false,
      selectedRating: 0, // 重置评分
    });
  },

  // 输入打卡内容
  onInputChange(e: any) {
    this.setData({
      checkinContent: e.detail.value,
    });
  },

  // 选择星级评分
  selectRating(e: any) {
    const rating = parseInt(e.currentTarget.dataset.rating);
    this.setData({
      selectedRating: rating,
    });
  },

  // 提交打卡
  async submitCheckin() {
    const { checkinContent, parking_spot_id, selectedRating } = this.data;
    if (!checkinContent.trim()) {
      tt.showToast({
        title: "请输入打卡内容",
        icon: "none",
      });
      return;
    }

    if (selectedRating === 0) {
      tt.showToast({
        title: "请选择营地评分",
        icon: "none",
      });
      return;
    }

    tt.showLoading({
      title: "提交中...",
    });

    // 调用打卡接口
    try {
      const res = await request<CheckinResponse>({
        url: `/api/parking_spots/check-in`,
        method: "POST",
        data: {
          comment: checkinContent,
          rating: selectedRating, // 添加评分
          id: parking_spot_id,
        },
      });

      if (res.code === 0) {
        tt.showToast({
          title: "打卡成功",
          icon: "success",
        });
        this.hideCheckinModal();
        // 刷新打卡记录
        this.fetchCheckIns(parking_spot_id);
      } else {
        tt.showToast({
          title: res.msg || "打卡失败",
          icon: "none",
        });
      }
    } catch (e) {
      console.error("打卡失败", e);
      tt.showToast({
        title: "网络错误，请重试",
        icon: "none",
      });
    } finally {
      tt.hideLoading();
    }
  },

  // 检查收藏状态（调用后端接口）
  async checkCollectionStatus(spotId: string) {
    const res = await request<CollectionResponse>({
      url: `/api/parking_spots/siteCampCollectStatus`,
      method: "GET",
      data: { id: spotId },
    });
    if (res.code === 0) {
      this.setData({ isCollected: res.data.isCollected });
    }
  },

  // 收藏/取消收藏（调用后端接口）
  async handleCollect() {
    // if (!checkIsVip('收藏')) {
    //   return
    // }
    const { isCollected, parking_spot_id } = this.data;

    try {
      let res: CollectionResponse;
      if (!isCollected) {
        // 添加收藏
        res = await request({
          url: `/api/parking_spots/collect`,
          method: "POST",
          data: { id: parking_spot_id },
        });
      } else {
        // 取消收藏
        res = await request({
          url: `/api/parking_spots/uncollect`,
          method: "POST",
          data: { id: parking_spot_id },
        });
      }

      if (res.code === 0) {
        this.setData({ isCollected: !isCollected });
        tt.showToast({
          title: res.msg,
          icon: "none",
          duration: 1500,
        });
      } else {
        tt.showToast({ title: res.msg, icon: "none" });
      }
    } catch (error) {
      console.error("收藏操作失败:", error);
      tt.showToast({ title: "网络请求失败", icon: "none" });
    }
  },

  // 修改营地信息
  handleModify() {
    // if (!checkIsVip('修改营地信息')) {
    //   return
    // }
    const { parking_spot_id } = this.data;
    tt.navigateTo({
      url: `/pages/add/add?id=${parking_spot_id}&mode=edit`,
    });
  }
});
