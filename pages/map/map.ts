import { FRONT_AES_PUBLIC_KEY } from "../../constants/common";
import { request } from "../../utils/http";
import { getDistanceInfo, calculateDistanceGCJ02, navigationToLocation, getLocationAsync } from "../../utils/gps";
import { storage } from "../../utils/storage";
import { getMarkerColor } from "../../utils/util";
import { encryptWithAESCBC, decryptWithAESCBC } from "../../utils/crypto";
import { isIOS } from '../../utils/device';
import debounce from '../../utils/debounce';
import { setToastInstance, showToast } from '../../utils/toast';
import { isSinglePageMode } from "../../utils/device";

interface ParkingSpot {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
  isCharged: boolean;
  images?: string[]; // 假设有图片字段
  description?: string; // 新增：描述字段
  directDistance?: number; // 新增：距离字段  daisy
  averageScore?: number; // 服务器返回的平均分
  markerId?: number; // 地图 marker 的 id
  scoreNumber?: number; // 由 averageScore 四舍五入得到
}
const SHARE_TITLE = '全国10万+免费床车房车露营地，点击查看'
const MARKER_ICON = {
  normal_star_0: "../../images/common/normal_star.png",
  normal_star_1: "../../images/common/normal_star.png",
  normal_star_2: "../../images/common/normal_star.png",
  normal_star_3: "../../images/common/normal_star_3.png",
  normal_star_4: "../../images/common/normal_star_4.png",
  normal_star_5: "../../images/common/normal_star_5.png",
};


const Type_Map = {
  star: "筛选最佳露营地\n以详情为准",
  toilet: "筛选有厕所的露营地\n以详情为准",
  water: "筛选可以接水的露营地\n以详情为准",
  charge: "筛选有充电桩的露营地\n以详情为准",
  tent: "筛选可以搭帐篷的露营地\n以详情为准",
  supermarket: "筛选商场/超市\n以详情为准",
  food: "筛选夜市/美食街/美食店\n以详情为准",
  vegetablemarket: "筛选菜市场\n以详情为准",
  parkingLot: "筛选停车场\n以详情为准",
  campingArea: "筛选露营地\n以详情为准",
  serviceArea: "筛选服务区\n以详情为准",
  rvPark: "筛选房车营地\n以详情为准",
  fire: "筛选可以明火做饭烧烤\n以详情为准",
  fish: "筛选可以钓鱼\n以详情为准",
  free: "筛选免费营地\n以详情为准"
}

type MapTypeKeys = keyof typeof Type_Map;
type FilterType = 'all' | MapTypeKeys;

const INIT_SCALE = 10;

Page({
  data: {
    isIos: isIOS(),
    _allSpots: [] as any[], // 不需要显示到视图上
    markers: [] as any[], // 地图标记点
    routeLineMarkers: [] as any[], // 地图标记点
    selectedSpot: null as ParkingSpot | null,
    showSpotCard: false,
    selectedMarkerId: -1,
    searchQuery: "", // 搜索框输入值
    lastRequestLocation: null as any,// 上次请求的位置
    lastRequestTime: 0, // 上次请求列表时间戳
    distanceThreshold: 1, // 距离阈值（公里）
    latitude: Number(storage.getItem('latitude')) || 39.91,
    longitude: Number(storage.getItem('longitude')) || 116.40,
    currentLocation: { latitude: 0, longitude: 0 }, // 当前GPS定位，不可人为改变
    centerLocation: { latitude: 0, longitude: 0 },// 当前地图中心位置
    scale: INIT_SCALE, // 地图比例
    filterType: 'all' as FilterType, // 新增：筛选类型
    lastMapScale: INIT_SCALE, // 地图比例
  },

  // 声明防抖函数，稍后在 onLoad 中初始化
  debounceSearchInput: () => { }, // 声明防抖搜索输入函数
  getListDebounced: () => { },

  // 声明地图上下文
  mapContext: null as any,

  onLoad() {
    try {
      this.mapContext = tt.createMapContext("mapContext", this);
      this.getInitCurrentLocation(INIT_SCALE);
      this.handleLoadCached();
      // 初始化自定义Toast
      this.initCustomToast();
    } catch (e) {
      console.error('mapLoadError', e)
    } finally {
      // 初始化列表请求防抖，避免 onRegionChange 在短时间内多次触发请求
      this.getListDebounced = debounce((params: any) => {
        this.getList(params);
      }, 400);
      // 检查是否处于单页模式（朋友圈分享场景）
      const isInSinglePageMode = isSinglePageMode();
      if (isInSinglePageMode) {
        tt.showModal({
          title: '提示',
          content: '点击下方前往小程序使用完整功能',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    }

  },

  // 初始化自定义Toast
  initCustomToast() {
    const toastComponent = this.selectComponent('#customToast');
    if (toastComponent) {
      setToastInstance(toastComponent);
    }
  },

  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: 'pages/map/map?source=mp_wechat_pages_map_onShareAppMessage'
    };
  },

  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      path: 'pages/map/map?source=mp_wechat_pages_map_onShareTimeline'
    };
  },

  async handleLoadCached() {
    try {
      const cached = await storage.getItemAsync('cached');
      const cached_weak_list = await storage.getItemAsync('cached_weak_list');
      if (cached_weak_list) {
        const data = decryptWithAESCBC({ key: FRONT_AES_PUBLIC_KEY, ciphertext: cached_weak_list });
        if (Array.isArray(data)) {
          this.data._allSpots = data;
          this.handleMarkersTitleWithScale(this.data._allSpots, this.data.scale);
          // 如果有500公里缓存先用这个
          return
        }
      }
      if (cached) {
        const data = decryptWithAESCBC({ key: FRONT_AES_PUBLIC_KEY, ciphertext: cached });
        if (Array.isArray(data)) {
          this.data._allSpots = data;
          this.handleMarkersTitleWithScale(this.data._allSpots, this.data.scale);
        }
      }
    } catch (e) {
      console.log('get cached error', e)
    }
  },

  // 地图中心点移动到指定为经纬度
  moveToNewLocation(longitude: number, latitude: number) {
    this.mapContext.moveToLocation({
      latitude,
      longitude,
    });
    this.getList({
      latitude,
      longitude,
      scale: 9,
    })
  },

  // 点击地图上的标记点
  handleMarkertap: async function (e: any) {

    const markerId = Number(e.detail.markerId);

    const clickedMarker = this.data.markers.find((m: any) => m.id === markerId);

    if (!clickedMarker) {
      console.log('点击地图上的标记点，未查找到clickedMarker', e)
      return
    }
    console.log('markerId', markerId, clickedMarker)
    this.setTapAvtiveMarker(markerId);
    const currentSelectedDetail = this.data._allSpots.find((sopt: any) => sopt.markerId === clickedMarker.id);
    if (!currentSelectedDetail) {
      console.error('未找到对应的营地信息');
      tt.showToast({
        title: '未找到对应的营地信息，请重启小程序重试',
        icon: 'error'
      })
      return;
    }


    // 弱网优化，先展示小卡片
    this.setData({
      selectedSpot: {
        ...currentSelectedDetail,
        descriptionTrim: currentSelectedDetail.description.slice(0, 95)
      },
      showSpotCard: true,
    });

    try {
      const res = await getLocationAsync();
      const { latitude: currentLat, longitude: currentLng } = res;
      // 计算距离
      const { latitude: spotLat, longitude: spotLng } = currentSelectedDetail;

      this.setData({
        currentLocation: {
          latitude: currentLat,
          longitude: currentLng
        }
      })

      // 计算距离（千米）
      try {
        const directDistance = getDistanceInfo(
          currentLat,
          currentLng,
          spotLat,
          spotLng
        );
        currentSelectedDetail.directDistance = directDistance; // 添加距离到详情数据
        this.setData({
          selectedSpot: {
            ...currentSelectedDetail,
            descriptionTrim: currentSelectedDetail.description.slice(0, 95)
          },
          showSpotCard: true,
        });
      } catch (e) {
        console.error('getFormattedDistance', e)
        currentSelectedDetail.directDistance = null;
      }
    } catch (e) {
      this.setData({
        selectedSpot: currentSelectedDetail,
        showSpotCard: true,
      });
    }
  },

  setTapAvtiveMarker(markerId: number) {
    try {
      // 更新选中状态
      const markers = this.data.markers.map((m: any) => {
        let iconPath = "";
        if (markerId === m.id) {
          m.callout.bgColor = '#000000'; //'#c63520'
          m.width = 28;
          m.height = 28;
          m.callout.fontSize = 13;
          iconPath = this.getIcon({
            isSelected: true,
            scoreNumber: m.scoreNumber
          });
        } else {
          m.callout.bgColor = getMarkerColor(m.scoreNumber);
          m.width = 25;
          m.height = 25;
          m.callout.fontSize = 12;
          iconPath = this.getIcon({
            isSelected: false,
            scoreNumber: m.scoreNumber
          });
        }
        return {
          ...m,
          iconPath: iconPath,
        };
      });
      this.setData({
        selectedMarkerId: markerId,
        markers,
      });
    } catch (e) {
      console.log("setTapAvtiveMarker", e);
    }
  },

  // 点击卡片跳转到详情页
  navigateToDetail: function () {
    const { selectedSpot } = this.data;
    if (selectedSpot) {
      tt.navigateTo({
        url: `/pages/detail/detail?id=${selectedSpot.id}`, // 假设详情页需要id
      });
    }
  },

  // 点击卡片上的导航按钮
  navigateToSpot: async function () {
    const { selectedSpot } = this.data;
    if (selectedSpot) {
      const { longitude, latitude, name, id } = selectedSpot;
      navigationToLocation({ longitude: Number(longitude), latitude: Number(latitude), name }, this.mapContext)
      request<any>({
        url: `/api/parking_spots/navigation`,
        method: "POST",
        data: {
          id: id,
        },
      });
    }
  },

  // 关闭卡片
  closeSpotCard: function () {
    this.setData({
      showSpotCard: false,
      selectedSpot: null, // 清空选中的停车位信息
    });
  },

  onRegionChange(e: any) {
    const { type } = e.detail;
    if (type === "end") {
      const { centerLocation, scale: newScale } = e.detail || {};
      if (!centerLocation) {
        return;
      }
      const { latitude, longitude } = centerLocation;
      this.setData({
        centerLocation: centerLocation,
        latitude,
        longitude,
        scale: newScale,
      });
      // 判读是否是缩放地图
      const { lastMapScale } = this.data
      console.log('lastMapScale', lastMapScale, newScale);
      if (Math.abs(lastMapScale - newScale) > 1) {
        this.setData({
          lastMapScale: newScale
        })
        this.getListDebounced({
          latitude,
          longitude,
          scale: newScale
        });
        return;
      }




      const { lastRequestLocation } = this.data
      console.log('lastRequestLocation?.latitude', typeof lastRequestLocation?.latitude)
      const distanceGCJ02 = lastRequestLocation?.latitude ? calculateDistanceGCJ02(
        latitude,
        longitude,
        lastRequestLocation?.latitude,
        lastRequestLocation?.longitude
      ) : 0;
      const moveDistance = lastRequestLocation ? (distanceGCJ02 || 0) / 1000 : this.data.distanceThreshold + 1;
      const canDragRequest = moveDistance > this.data.distanceThreshold;
      if (canDragRequest) {
        this.getListDebounced({
          latitude,
          longitude,
          scale: newScale
        });
      }


      // if (causedBy === 'scale') {
      //   // 弱网优化
      //   this.handleMarkersTitleWithScale(this.data._allSpots, newScale);
      // }

    }
  },

  getWeakNetWorkList: async function ({
    latitude,
    longitude
  }: {
    latitude: number;
    longitude: number;
  }) {
    const filterType = 'all';
    const data = {
      latitude,
      longitude,
      filters: [filterType],
      scale: 5
    };
    const res = await request<any>({
      url: "/api/parking_spots/weak",
      method: "POST",
      data: data,
    });

    if (res.code === 0) {
      let list = (res.data.list as unknown as ParkingSpot[]) || [];
      list = list.map(item => {
        return {
          ...item,
          scoreNumber: Math.round(item.averageScore || 0)
        }
      })

      try {
        if (list?.length) {
          const encryptWithAESCBCData = encryptWithAESCBC(
            JSON.stringify(list),
            FRONT_AES_PUBLIC_KEY
          );
          storage.setItem('cached_weak_list', encryptWithAESCBCData.ciphertext)
        }
      } catch (e) {
        console.log('缓存 error: ', e);
      }

    }
  },

  getList: async function ({
    latitude,
    longitude,
    scale
  }: {
    latitude: number;
    longitude: number;
    scale: number
  }) {
    const { filterType } = this.data;
    const data = {
      latitude,
      longitude,
      filters: [filterType],
      scale
    };
    const res = await request<any>({
      url: "/api/parking_spots",
      method: "POST",
      data: data,
    });

    if (res.code === 0) {
      const list = (res.data.list as unknown as ParkingSpot[]) || [];
      this.data._allSpots = list.map(item => {
        return {
          ...item,
          scoreNumber: Math.round(item.averageScore || 0)
        }
      })
      console.log('typeof latitude', typeof latitude)
      this.setData({
        lastRequestLocation: {
          latitude,
          longitude
        },
        lastRequestTime: Date.now(),
      });
      this.handleMarkersTitleWithScale(this.data._allSpots, scale);
      this.handleCacheLatestRequestList(this.data._allSpots)
      if (this.data.filterType && this.data.filterType !== 'all') {
        const newTitle = Type_Map[this.data.filterType as MapTypeKeys]
        newTitle && showToast({
          title: `${newTitle}`,
          icon: "none",
          duration: 1000,
        });
      }
    }
  },

  handleCacheLatestRequestList(list: any) {
    try {
      if (list?.length) {
        const encryptWithAESCBCData = encryptWithAESCBC(
          JSON.stringify(list),
          FRONT_AES_PUBLIC_KEY
        );
        storage.setItem('cached', encryptWithAESCBCData.ciphertext)
      }
    } catch (e) {
      console.log('缓存 error: ', e);
    }
  },

  handleMarkersTitleWithScale: function (list: any, scale: number) {
    const { selectedMarkerId } = this.data;

    // 对输入列表进行去重，确保没有重复的ID
    const uniqueList = [];
    const seenIds = new Set();

    for (const item of list) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    }

    const markers = uniqueList.map((item: ParkingSpot) => {
      const {
        id,
        markerId,
        name,
        longitude: itemLongitude,
        latitude: itemLatitude,
        scoreNumber
      } = item;
      let iconPath = "";
      let newName = name;

      if (scale <= 8) {
        newName = name?.slice(0, 1);
      } else if (scale <= 9) {
        newName = name?.slice(0, 1);
      } else if (scale <= 10) {
        newName = name?.slice(0, 1);
      } else if (scale <= 11) {
        newName = name?.slice(0, 1);
      } else if (scale <= 12) {
        newName = name?.slice(0, 2);
      } else if (scale <= 13) {
        newName = name?.slice(0, 3);
      } else if (scale <= 14) {
        newName = name?.slice(0, 4);
      } else if (scale <= 15) {
        newName = name?.slice(0, 5);
      } else if (scale <= 16) {
        newName = name?.slice(0, 6);
      } else if (scale <= 17) {
        newName = name?.slice(0, 7);
      }

      // 根据平台设置padding值, 安卓上使用更大的值
      let paddingValue = 4;
      if (this.data.isIos) {
        paddingValue = 2; // 
      }
      const isSelectedMarker = selectedMarkerId === markerId;
      const callout = {
        content: newName,
        fontSize: isSelectedMarker ? 13 : 12,
        display: 'ALWAYS',
        padding: paddingValue,
        color: '#ffffff',
        bgColor: isSelectedMarker ? '#000000' : getMarkerColor(scoreNumber ?? 0),
      };

      if (this.data.selectedSpot?.id === id) {
        // iconPath = MARKER_ICON.selected;
        iconPath = this.getIcon({
          isSelected: true,
          scoreNumber
        });
      } else {
        iconPath = this.getIcon({
          isSelected: false,
          scoreNumber
        });
      }


      return {
        callout,
        alpha: 1,
        longitude: itemLongitude,
        latitude: itemLatitude,
        id: markerId,
        scoreNumber,
        width: isSelectedMarker ? 28 : 25,
        height: isSelectedMarker ? 28 : 25,
        iconPath,
        markerType: 'spot'
      };
    });
    const finalMarkers = this.stableMarkers(this.data.markers, markers);
    this.setData({ markers: finalMarkers });
  },

  getIcon({
    scoreNumber
  }: {
    isSelected: boolean,
    scoreNumber: number | undefined
  }) {
    let iconPath = MARKER_ICON.normal_star_0;
    switch (scoreNumber ?? 0) {
      case 0:
        iconPath = MARKER_ICON.normal_star_0
        break;
      case 1:
        iconPath = MARKER_ICON.normal_star_1
        break;
      case 2:
        iconPath = MARKER_ICON.normal_star_2
        break;
      case 3:
        iconPath = MARKER_ICON.normal_star_3
        break;
      case 4:
        iconPath = MARKER_ICON.normal_star_4
        break;
      case 5:
        iconPath = MARKER_ICON.normal_star_5
        break;
      default:
        iconPath = MARKER_ICON.normal_star_0;
    }
    return iconPath;
  },

  stableMarkers: function (oldMarkers: any, routeLineMarkers: any) {
    // 首先对routeLineMarkers进行去重，确保没有重复的ID
    const uniquerouteLineMarkers = [];
    const seenIds = new Set();

    for (const newMarker of routeLineMarkers) {
      if (!seenIds.has(newMarker.id)) {
        seenIds.add(newMarker.id);
        uniquerouteLineMarkers.push(newMarker);
      }
    }

    return uniquerouteLineMarkers.map(newMarker => {
      const old = oldMarkers.find((o: any) => o.id === newMarker.id);
      // 只要内容没变就用旧对象
      if (old && JSON.stringify(old) === JSON.stringify(newMarker)) {
        return old;
      }
      return newMarker;
    });
  },

  getInitCurrentLocation: async function (scale: number) {
    const res = await getLocationAsync({ showModalTip: true });
    console.log('getInitCurrentLocationres', res)
    const { latitude, longitude } = res;
    this.setData({
      scale: scale,
      latitude,
      longitude,
      currentLocation: { latitude, longitude }, // 保存当前位置
      centerLocation: { latitude, longitude },
    });
    // 获取常规营地列表
    this.getList({ latitude, longitude, scale })
    // 获取500公里内营地列表并缓存
    this.getWeakNetWorkList({ latitude, longitude });
  },

  // 跳转到新增营地页面
  navigateToAdd() {
    tt.navigateTo({
      url: "/pages/add/add",
    });
  },

  // 关闭卡片
  handleCloseSoptCard() {
    this.setData({
      showSpotCard: false
    })
  },

  navigateToMyFav() {
    tt.navigateTo({
      url: "/pages/collection/collection?type=collection&title=我的收藏",
    });
  },
  // 跳转到我的页面
  navigateToProfile() {
    tt.switchTab({
      url: "/pages/profile/profile",
    });
  },
  scaleSmallMap() {
    const { latitude, longitude, } = this.data.centerLocation
    this.mapContext.getScale({
      success: (scaleRes: any) => {
        let scale = scaleRes.scale;
        if (scaleRes.scale >= 6) {
          scale = scale - 2;
        }
        this.handleMarkersTitleWithScale(this.data._allSpots, scale);
        this.setData({
          latitude,
          longitude,
          scale
        }, () => {
          this.getList({
            latitude,
            longitude,
            scale
          })
        })
      },
      fail: () => {
        this.setData({
          scale: 8,
          latitude,
          longitude
        }, () => {
          this.getList({
            latitude,
            longitude,
            scale: 8,
          })
        })
      }
    })
  },

  scaleBigMap() {
    const { latitude, longitude, } = this.data.centerLocation
    this.mapContext.getScale({
      success: (scaleRes: any) => {
        let scale = scaleRes.scale;
        if (scaleRes.scale <= 18) {
          scale = scale + 2;
        }
        this.handleMarkersTitleWithScale(this.data._allSpots, scale);
        this.setData({
          scale,
          latitude,
          longitude,
        }, () => {
          this.getList({
            latitude,
            longitude,
            scale,
          })
        })
      },
      fail: () => {
        this.setData({
          scale: 13,
          latitude,
          longitude
        }, () => {
          this.getList({
            latitude,
            longitude,
            scale: 13,
          })
        })
      }
    })
  },

  async handleClickCurrentLocation() {
    const res = await getLocationAsync({ showModalTip: true });
    const { latitude, longitude } = res;
    this.mapContext.getScale({
      success: (scaleRes: any) => {
        let scale = scaleRes.scale;
        if (scaleRes.scale <= 12) {
          scale = 18
        }

        if (scaleRes.scale > 12) {
          scale = 11
        }

        this.handleMarkersTitleWithScale(this.data._allSpots, scale);
        this.setData({
          scale
        }, () => {
          this.mapContext.moveToLocation({
            latitude,
            longitude,
          });
          this.getList({
            latitude,
            longitude,
            scale,
          })
        })
      },
      fail: () => {
        this.getList({
          latitude,
          longitude,
          scale: INIT_SCALE,
        })
      }
    })
  },
  onFilterTap(e: any) {
    const type = e.detail.type;
    if (type !== this.data.filterType) {
      if (type !== 'all') {
        // 如果选择了其他筛选项，清空以前储存的list
        this.data._allSpots = []
      }
      this.setData({ filterType: type }, () => {
        const { latitude, longitude } = this.data.centerLocation;
        this.getList({ latitude, longitude, scale: this.data.scale });
      });
    }
  },
  // 点击热门线路
  navigateToTourToutes() {
    tt.navigateTo({
      url: `/pages/tourRoutes/tourRoutes`,
    });
  },
  // 选择位置
  handleChooseLocation(e: any) {
    const { latitude, longitude } = e.detail || {};
    this.setData({ scale: INIT_SCALE }, () => {
      this.mapContext.moveToLocation({ latitude, longitude, });
      this.getList({ latitude, longitude, scale: this.data.scale })
    })
  }
});

