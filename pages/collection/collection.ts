// pages/collection/collection.js
import { getDistanceInfo, getLocationAsync, navigationToLocation } from "../../utils/gps";
import { request } from "../../utils/http";

Page({
  data: {
    dynamicTitle: '',  // 用于存储动态标题
    collections: [],
    isLoading: true,
    currentLocation: null, // 新增：当前位置
    type: '', // collection checkin camp
    page: 1,
    pageSize: 10,
    hasMore: false
  },

  onLoad(options) {
    const { title, type } = options;
    this.mapCtx = wx.createMapContext("myMap");
    this.setData({ dynamicTitle: title, type })
    type && this.getCurrentLocation(type);
  },

  onShow() {
    const { dynamicTitle } = this.data
    if (dynamicTitle) {
      wx.setNavigationBarTitle({
        title: dynamicTitle
      })
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1
    }, () => {
      this.getCurrentLocation(this.data.type);
    })
  },

  onReachBottom() {
    const { hasMore, page, type } = this.data
    if (hasMore) {
      this.setData({
        page: page + 1,
      }, () => {
        this.getCurrentLocation(type)
      })
    } else {
      wx.showToast({
        icon: "none",
        title: '我是有底线的',
        duration: 2000
      })
    }
  },

  getCurrentLocation: async function (type: string) {
    const res = await getLocationAsync();
    const { latitude, longitude } = res;
    this.setData({
      currentLocation: { latitude, longitude }, // 保存当前位置
    }, () => {
      const { page, pageSize } = this.data;
      this.loadList(type, page, pageSize);
    });
  },
  loadList(type: string, page: number, pageSize: number) {
    switch (type) {
      case "collection":
        this.loadCollections(page, pageSize);
        break;
      case "checkin":
        this.loadCheckins(page, pageSize)
        break;
      case "camp":
        this.loadCamps(page, pageSize);
        break;
    }
  },
  async loadCollections(page: number, pageSize: number) {
    try {
      wx.showLoading({
        title: '加载中'
      })
      const res: any = await request({
        url: "/api/users/collections",
        method: "GET",
        data: {
          page,
          pageSize
        }
      });
      if (res.code === 0) {
        let list = [];
        if (res.data.list.length > 0) {
          if (page == 1) {
            list = res.data.list;
          } else {
            // 需要拼接数据
            list = [...this.data.collections, ...res.data.list]
          }
        }
        this.setData({
          hasMore: res.data.hasMore,
          collections: list.map((item: any) => {
            const { longitude, latitude } = item;
            // 计算距离（千米）
            const distance = getDistanceInfo(
              this.data.currentLocation.latitude,
              this.data.currentLocation.longitude,
              latitude,
              longitude
            );
            return {
              ...item,
              distance: distance
            }
          })
        });
      }

    } catch (error) {
      console.error("加载失败", error);
      wx.showToast({ title: "加载失败，请重试", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
      wx.hideLoading()
    }
  },
  async loadCheckins(page: number, pageSize: number) {
    try {
      wx.showLoading({
        title: '加载中'
      })
      const res = await request({
        url: "/api/users/checkins",
        method: 'GET',
        data: {
          page,
          pageSize
        }
      });


      if (res.code === 0) {
        const hasMore = res.data.hasMore;

        let list = [];
        if (res.data.list.length > 0) {
          if (page == 1) {
            list = res.data.list;
          } else {
            // 需要拼接数据
            list = [...this.data.collections, ...res.data.list]
          }
        }

        this.setData({
          hasMore: hasMore,
          collections: list.map(item => {
            const { longitude, latitude } = item;
            // 计算距离（千米）
            const distance = getDistanceInfo(
              this.data.currentLocation.latitude,
              this.data.currentLocation.longitude,
              latitude,
              longitude
            );
            return {
              ...item,
              distance
            }
          })
        });
      }
    } catch (error) {
      console.error("加载失败", error);
      wx.showToast({ title: "加载失败，请重试", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
      wx.hideLoading();
    }
  },

  async loadCamps(page: number, pageSize: number) {
    try {
      wx.showLoading({
        title: '加载中'
      })
      const res = await request({
        url: "/api/users/camps",
        method: "GET",
        data: {
          page,
          pageSize
        }
      });
      if (res.code === 0) {


        const hasMore = res.data.hasMore;

        let list = [];
        if (res.data.list.length > 0) {
          if (page == 1) {
            list = res.data.list;
          } else {
            // 需要拼接数据
            list = [...this.data.collections, ...res.data.list]
          }
        }


        this.setData({
          hasMore,
          collections: list.map(item => {
            const { longitude, latitude } = item;
            // 计算距离（千米）
            const distance = getDistanceInfo(
              this.data.currentLocation.latitude,
              this.data.currentLocation.longitude,
              latitude,
              longitude
            );
            return {
              ...item,
              distance: distance
            }
          })
        });
      }
    } catch (error) {
      console.error("加载失败", error);
      wx.showToast({ title: "加载失败，请重试", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
      wx.hideLoading();
    }
  },

  // 跳转到详情页
  navigateToDetail(e) {
    const spotId = e.detail.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${spotId}` });
  },

  // 导航到位置
  navigateToSpot(e: any) {
    const spotId = e.detail.id;
    const spot: any = this.data.collections.find((item: any) => item.id === spotId);

    if (spot) {
      navigationToLocation({ longitude: spot.longitude, latitude: spot.latitude, name: spot.name }, this.mapCtx)

    }
  },



});
