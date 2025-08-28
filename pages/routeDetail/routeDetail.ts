import { navigationToLocation, openLocation } from "../../utils/gps";
import { request } from "../../utils/http";

interface RoutePoint {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

interface RouteDetail {
  id: string;
  name: string;
  description: string;
  color: string;
  points: RoutePoint[];
  totalDistance?: number;
  estimatedTime?: number;
  difficulty?: string;
  bestSeason?: string;
  notes?: string;
}

// 若在开发者工具中无法预览广告，请切换开发者工具中的基础库版本
// 在页面中定义插屏广告
let interstitialAd: any = null

Page({
  data: {
    routeId: '',
    routeDetail: {
      color: '#2e2e2e'
    } as RouteDetail,
    loading: true,
    error: '',
    mapScale: 12,
    mapCenter: {
      latitude: 23.1291,
      longitude: 113.2644
    },
    routeMarkers: [] as any[],
    routePolyline: [] as any[]
  },

  // 声明地图上下文
  mapContext: null as any,

  onLoad(options: any) {
    if (options.id) {
      this.setData({ routeId: options.id }, () => {
        this.loadRouteDetail();
      });

      // 在页面onLoad回调事件中创建插屏广告实例
      if (wx.createInterstitialAd) {
        interstitialAd = wx.createInterstitialAd({
          adUnitId: 'adunit-a96a085be6808b0b'
        })
        interstitialAd.onLoad(() => {

        })
        interstitialAd.onError((err) => {
          console.error('插屏广告加载失败', err)
        })
        interstitialAd.onClose(() => { })
      }

    } else {
      this.setData({
        error: '缺少路线ID参数',
        loading: false
      });
    }

    this.mapContext = wx.createMapContext("mapContext", this);
  },

  onShow() {
    // 在适合的场景显示插屏广告
    if (interstitialAd) {
      interstitialAd.show().catch((err: any) => {
        console.error('插屏广告显示失败', err)
      })
    }
  },


  onShareAppMessage() {
    const name = this.data.routeDetail.name
    const id = this.data.routeDetail.id
    return {
      title: '你的好友给你赠送了一份自驾线路攻略地图，点击查看：' + name,
      path: `pages/routeDetail/routeDetail?id=${id}&source=mp_weixin_pages_routeDetail_onShareAppMessage`
    };
  },

  onShareTimeline() {
    const name = this.data.routeDetail.name
    const id = this.data.routeDetail.id
    return {
      title: '你的好友给你赠送了一份自驾线路攻略地图，点击查看：' + name,
      path: `pages/routeDetail/routeDetail?id=${id}&source=mp_weixin_pages_routeDetail_onShareTimeline`
    };
  },

  // 加载路线详情
  async loadRouteDetail() {
    try {
      this.setData({ loading: true, error: '' });

      const res = await request({
        url: '/api/tour-routes/detail',
        method: 'GET',
        data: { id: this.data.routeId }
      });

      if (res.code === 0 && res.data) {
        const routeDetail = res.data;
        if (routeDetail.name) {
          wx.setNavigationBarTitle({
            title: routeDetail.name + '-路线详情'
          })
        }
        this.setData({ routeDetail });
        // 设置地图中心点和标记点
        this.setupMapData(routeDetail);
      } else {
        this.setData({ error: res.message || '获取路线详情失败' });
      }
    } catch (error) {
      console.error('获取路线详情失败', error);
      this.setData({ error: '网络请求失败，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 设置地图数据
  setupMapData(routeDetail: RouteDetail) {
    if (!routeDetail.points || routeDetail.points.length === 0) {
      return;
    }

    const points = routeDetail.points;

    // 设置地图中心点为第一个点
    const centerPoint = points[0];
    this.setData({
      mapCenter: {
        latitude: centerPoint.latitude,
        longitude: centerPoint.longitude
      }
    });

    // 设置标记点
    const markers = points.map((waypoint, index) => ({
      id: index,
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      width: 32,
      height: 32,
      iconPath: 'https://icons.unistar.icu/icons/ding.png',
      callout: {
        content: `${index + 1}. ${waypoint.name || '途经点'}`,
        fontSize: 14,
        display: 'ALWAYS',
        padding: 8,
        color: '#ffffff',
        bgColor: routeDetail.color,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ffffff'
      }
    }));

    // 设置路线
    const polyline = [{
      points: points.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude
      })),
      color: routeDetail.color || '#58be6a',
      width: routeDetail.width || 2,
      arrowLine: true
    }];

    this.setData({
      routeMarkers: markers,
      routePolyline: polyline
    });

    this.zoomToIncludeAllRoutes(markers)
  },

  // 地图标记点点击事件
  onMarkerTap(e: any) {
    const markerId = e.markerId;
    const point = this.data.routeDetail.points[markerId];
    if (point) {
      const { latitude, longitude, name } = point
      openLocation({
        latitude, longitude, name
      })
    }
  },

  // 地图放大
  zoomInMap() {
    let newScale = this.data.mapScale + 1;
    if (newScale > 20) newScale = 20;
    this.setData({ mapScale: newScale });
  },

  // 地图缩小
  zoomOutMap() {
    let newScale = this.data.mapScale - 1;
    if (newScale < 3) newScale = 3;
    this.setData({ mapScale: newScale });
  },

  // 重置地图视图
  resetMapView() {
    const { routeMarkers } = this.data
    this.zoomToIncludeAllRoutes(routeMarkers)
  },

  // 重试按钮点击事件
  onRetry() {
    this.loadRouteDetail();
  },

  // 申请修改路线
  onEditRoute() {
    wx.navigateTo({
      url: `/pages/addRoute/addRoute?id=${this.data.routeId}`
    });
  },

  // 点击途经点
  handleTapPointItem(event: any) {
    const ponitId = event.currentTarget.dataset.pointid;
    if (!ponitId) {
      return;
    }
    const results = this.data.routeDetail.points.filter(item => item.id === ponitId);

    if (!results || results.length === 0) {
      return
    }
    const { latitude, longitude, name } = results[0]
    openLocation({
      latitude, longitude, name
    })
  },

  // 新增：缩放到包含所有选择的线路
  zoomToIncludeAllRoutes(markers: any[]) {
    if (!markers || markers.length === 0 || !this.mapContext) {
      return;
    }

    // 使用 includePoints 方法将地图缩放到能看到所有标记点
    this.mapContext.includePoints({
      points: markers.map(marker => ({
        latitude: marker.latitude,
        longitude: marker.longitude
      })),
      padding: [50, 50, 50, 50], // 上下左右各留50px的边距
      success: () => {
        console.log('地图已自动缩放到包含所有选择的线路');
      },
      fail: (error: any) => {
        console.error('地图缩放失败:', error);
        // 如果 includePoints 失败，使用备用的计算缩放方法
        this.calculateAndSetOptimalScale(markers);
      }
    });
  },

  // 新增：备用的计算最优缩放级别方法
  calculateAndSetOptimalScale(markers: any[]) {
    if (markers.length === 0) return;

    if (markers.length === 1) {
      // 只有一个点，设置合适的缩放级别
      this.setData({
        latitude: markers[0].latitude,
        longitude: markers[0].longitude,
        scale: 12
      });
      return;
    }

    // 计算所有点的边界
    let minLat = markers[0].latitude;
    let maxLat = markers[0].latitude;
    let minLng = markers[0].longitude;
    let maxLng = markers[0].longitude;

    markers.forEach(marker => {
      minLat = Math.min(minLat, marker.latitude);
      maxLat = Math.max(maxLat, marker.latitude);
      minLng = Math.min(minLng, marker.longitude);
      maxLng = Math.max(maxLng, marker.longitude);
    });

    // 计算中心点
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // 计算合适的缩放级别
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    // 根据距离差计算合适的缩放级别
    let scale = 10;
    if (maxDiff > 0.1) scale = 8;      // 距离很大
    else if (maxDiff > 0.05) scale = 9; // 距离较大
    else if (maxDiff > 0.02) scale = 10; // 距离中等
    else if (maxDiff > 0.01) scale = 11; // 距离较小
    else scale = 12;                     // 距离很小

    // 设置地图中心点和缩放级别
    this.setData({
      latitude: centerLat,
      longitude: centerLng,
      scale: scale
    });
  },
});
