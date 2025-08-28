import { getLocationAsync, navigationToLocation } from "../../utils/gps";
import { request } from "../../utils/http";
import debounce from "../../utils/debounce";

const SHARE_TITLE = "好友向您赠送了一份热门自驾线路攻略地图，点击查看！";
const TAG = "pages/tourRoutes/tourRoutes.ts";
const MARKER_ICON = {
  normal_star_0: "https://icons.unistar.icu/icons/normal_star.png",
  normal_star_1: "https://icons.unistar.icu/icons/normal_star.png",
  normal_star_2: "https://icons.unistar.icu/icons/normal_star.png",
  normal_star_3: "https://icons.unistar.icu/icons/normal_star_3.png",
  normal_star_4: "https://icons.unistar.icu/icons/normal_star_4.png",
  normal_star_5: "https://icons.unistar.icu/icons/normal_star_5.png",

  selected_star_0: "https://icons.unistar.icu/icons/selected_star.png",
  selected_star_1: "https://icons.unistar.icu/icons/selected_star.png",
  selected_star_2: "https://icons.unistar.icu/icons/selected_star.png",
  selected_star_3: "https://icons.unistar.icu/icons/selected_star_3.png",
  selected_star_4: "https://icons.unistar.icu/icons/selected_star_4.png",
  selected_star_5: "https://icons.unistar.icu/icons/selected_star_5.png",

  // 新增：旅游路线专用图标
  route_point: "https://icons.unistar.icu/icons/ding.png", // 可以替换为专门的路线图标
};

// 在页面中定义激励视频广告
let rewardedVideoAd: any = null;

Page({
  /**
   * 页面的初始数据
   */
  data: {
    tourRoutes: [],
    allMarkers: [],
    polylines: [],
    scale: 4,
    lastMapScale: 4,
    currentGPSLocation: {},
    mapCenterLocation: {
      latitude: 29.65, // 默认展示布达拉宫定位，展示318
      longitude: 91.12,
    },
  },

  // 防抖后的查询方法（在 onLoad 中初始化）
  getNearTourRoutesDebounced: () => { },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    this.mapContext = tt.createMapContext("mapContext", this);
    // 初始化请求防抖，避免地图交互频繁触发接口
    this.getNearTourRoutesDebounced = debounce(
      (location: { latitude: number; longitude: number }) => {
        this.getNearTourRoutes(location);
      },
      400
    );
    this.getCurrentLocationAndNextGetNearTourRoutes();
  },

  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: "pages/tourRoutes/tourRoutes?source=mp_weixin_pages_tourRoutes_onShareAppMessage",
    };
  },

  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      path: "pages/tourRoutes/tourRoutes?source=mp_weixin_pages_tourRoutes_onShareTimeline",
    };
  },

  // 地图变化
  onRegionChange(e: any) {
    const { type } = e.detail;
    if (type === "end") {
      const { centerLocation, scale: newScale } = e.detail || {};
      if (!centerLocation) return;
      const { latitude, longitude } = centerLocation;
      this.setData({
        centerLocation: centerLocation,
        latitude,
        longitude,
        scale: newScale,
      });
      // 判读是否是缩放地图, 如果是的话，不需要请求
      const { lastMapScale } = this.data
      if (Math.abs(lastMapScale - newScale) > 1) {
        return
      }
      // 检查权限，有权限才能继续请求
      if (this.data.canAccessMoreRoutes) {
        this.getNearTourRoutesDebounced({ latitude, longitude });
      }
    }
  },

  // 初始化获取一个线路
  async getOneHotTourRoute() {
    try {
      this.setData({ loading: true });
      const res = await request({
        url: "/api/tour-routes/oneHotTourRoute",
        method: "GET",
        data: {},
      });
      if (res.code === 0) {
        const routes = res.data || {};
        if (Array.isArray(routes)) {
          this.handleDataListToMarkerAndPolyline({ tourRoutes: routes });
          this.setData({
            tourRoutes: routes,
          });
        }
      }
    } catch (error) {
      console.error("获取旅游线路失败", error);
    }
  },

  // 获取初始地理位置
  async getCurrentLocationAndNextGetNearTourRoutes() {
    const res = await getLocationAsync({ showModalTip: true });
    const { latitude, longitude } = res;
    this.setData({
      mapCenterLocation: {
        latitude,
        longitude,
      },
      currentGPSLocation: {
        latitude,
        longitude,
      },
    });

    this.getNearTourRoutes({ latitude, longitude });
  },

  // 获取附近1000公里的路线
  async getNearTourRoutes(location: { latitude: number; longitude: number }) {
    const { latitude, longitude } = location;
    try {
      if (latitude > 0 && longitude > 0) {
        this.setData({ loading: true });
        const res = await request({
          url: "/api/tour-routes/nearbyAccess",
          method: "GET",
          data: { latitude, longitude },
        });
        if (res.code === 0) {
          const { userLimit, routes } = (res.data as any) || {};
          if (userLimit) {
            const { isUnlocked } = userLimit;
            this.setData({
              canAccessMoreRoutes: isUnlocked,
            });
          }
          if (Array.isArray(routes)) {
            this.handleDataListToMarkerAndPolyline({ tourRoutes: routes });
            this.setData({
              tourRoutes: routes,
            });
          }
        }
      }
    } catch (error) {
      console.error("获取旅游线路失败", error);
    }
  },

  handleDataListToMarkerAndPolyline({ tourRoutes }: { tourRoutes: any[] }) {
    if (Array.isArray(tourRoutes)) {
      const routeLineMarkers: any[] = [];
      tourRoutes.map((tourRoute: any) => {
        tourRoute.points.map((item: any) => {
          const { name, longitude, latitude, markerId, showNameOnMap } = item;
          routeLineMarkers.push({
            callout: showNameOnMap
              ? {
                content: name,
                fontSize: 12,
                display: "ALWAYS",
                padding: 1,
                color: "#ffffff",
                bgColor: tourRoute.color || "#1890ff", // 蓝色背景，区分旅游路线
                borderRadius: 0,
                borderWidth: 1,
                borderColor: "#ffffff",
              }
              : null,
            alpha: 1,
            longitude,
            latitude,
            id: markerId,
            width: 14, // 稍微大一点，突出显示
            height: 14,
            iconPath: MARKER_ICON.route_point,
            // 添加特殊标识，便于后续处理
            pointName: name,
            isRoutePoint: true,
            routeType: "tour",
          });
        });
      });

      // 为每条选中的线路创建polyline
      const polylines = tourRoutes
        .map((route: any, index: number) => {
          if (!route) return null;
          // 生成正确的分段文本
          const segmentTexts: any[] = [];
          for (let i = 0; i < route.points.length - 1; i++) {
            const name = route.name;
            segmentTexts.push({
              name: name,
              startIndex: i,
              endIndex: i + 1,
            });
          }

          return {
            id: index,
            points: route.points,
            segmentTexts: segmentTexts,
            color: route.color,
            width: route.width,
            arrowLine: true,
            textStyle: {
              textColor: "#ffffff",
              strokeColor: "#000000",
              fontSize: 22,
            },
          };
        })
        .filter(Boolean); // 过滤掉null值

      this.setData({
        allMarkers: routeLineMarkers,
        polylines,
      });
    }
  },

  selectRoute(e: any) {
    const routeId = e.currentTarget.dataset.routeid;
    // 如果有路线ID，跳转到详情页面
    if (routeId) {
      tt.navigateTo({
        url: `/pages/routeDetail/routeDetail?id=${routeId}`,
      });
    }
  },

  // 点击地图上的标记点
  handleMarkertap: async function (e: any) {
    const markerId = e.markerId;
    const clickedMarker = this.data.allMarkers.find(
      (m: any) => m.id === markerId
    );
    // 点击旅游线路标记点
    const { latitude, longitude, pointName } = clickedMarker;
    navigationToLocation(
      { longitude, latitude, name: pointName },
      this.mapContext
    );
  },

  // 新增线路
  addRoute() {
    tt.navigateTo({
      url: "/pages/addRoute/addRoute",
    });
  },

  // 点击当前定位
  handleClickCurrentLocation() {
    this.getCurrentLocationAndNextGetNearTourRoutes();
  },

  // handlePolylinetap
  handlePolylinetap(event: any) {
    const index = event.detail.polylineId;
    const { tourRoutes } = this.data;
    if (index >= 0) {
      const tourRoute = tourRoutes[index];
      tt.navigateTo({
        url: `/pages/routeDetail/routeDetail?id=${tourRoute.id}`,
      });
    }
  },
});
