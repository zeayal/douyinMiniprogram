import { request } from "../../utils/http";
import { storage } from "../../utils/storage";
import { getOptimizedSafeColors } from "../../utils/util";

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

Page({
  data: {
    routeWidthItems: [
      { name: '国家级高速、跨省干线', value: 3 },
      { name: '省级国道、跨市干线、重点景区连接线', value: 2 },
      { name: '环湖路、景区内部路、短途支线、城市支线', value: 1 },
    ],
    routeName: '', // 线路名称
    routeDescription: '', // 线路描述
    width: 2,
    waypoints: [] as any[], // 途经点列表
    selectedColor: '#1E90FF', // 选中的线路颜色 - 使用优化的蓝色
    // 使用优化的安全颜色建议，确保颜色间有足够差异
    quickColors: getOptimizedSafeColors(12),
    showColorPickerModal: false, // 是否显示颜色选择器弹窗
    showWaypointModal: false, // 是否显示途经点编辑弹窗
    belowInsertWaypointIndex: -1, // 在谁下面新增途经点
    editingWaypointIndex: -1, // 正在编辑的途经点索引
    editingWaypoint: { // 正在编辑的途经点数据
      name: '',
      address: '',
      latitude: 0,
      longitude: 0
    },
    userHasInteracted: false, // 用户是否已开始操作
    isEditMode: false, // 是否为编辑模式
    editRouteId: '', // 编辑的路线ID
    // 地图预览相关数据
    showMapPreview: false, // 是否显示地图预览弹框
    mapScale: 10, // 地图缩放级别
    mapCenter: { latitude: 39.91, longitude: 116.40 }, // 地图中心位置
    routeMarkers: [] as any[], // 路线标记点
    routePolyline: [] as any[] // 路线连线
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
      routeName: this.data.routeName,
      routeDescription: this.data.routeDescription,
      width: this.data.width,
      waypoints: this.data.waypoints,
      selectedColor: this.data.selectedColor,
      timestamp: Date.now()
    };

    try {
      storage.setItem('addRoute_form_draft', saveData);
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  },

  // 检查是否有实际内容
  hasActualContent() {
    const { routeName, routeDescription, waypoints } = this.data;

    // 检查基本信息
    if (routeName && routeName.trim()) return true;
    if (routeDescription && routeDescription.trim()) return true;
    if (waypoints && waypoints.length > 0) return true;

    return false;
  },

  // 从localStorage恢复数据
  loadFromLocalStorage() {
    try {
      const savedData = storage.getItem('addRoute_form_draft');
      if (savedData && savedData.timestamp) {
        // 检查草稿是否在24小时内
        const isExpired = Date.now() - savedData.timestamp > 24 * 60 * 60 * 1000;
        if (isExpired) {
          tt.removeStorageSync('addRoute_form_draft');
          return false;
        }

        // 恢复数据
        this.setData({
          routeName: savedData.routeName || "",
          routeDescription: savedData.routeDescription || "",
          width: savedData.width || 2,
          waypoints: savedData.waypoints || [],
          selectedColor: savedData.selectedColor || '#1E90FF',
          userHasInteracted: true // 恢复草稿说明用户之前已操作过
        });

        return true;
      }
    } catch (error) {
      console.error('加载草稿失败:', error);
    }
    return false;
  },

  // 清除localStorage中的草稿
  clearLocalStorage() {
    try {
      tt.removeStorageSync('addRoute_form_draft');
    } catch (error) {
      console.error('清除草稿失败:', error);
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
    // 检查是否为编辑模式
    if (options.id) {
      // 设置页面标题为编辑模式
      tt.setNavigationBarTitle({
        title: '编辑线路'
      });
      this.loadRouteDetail(options.id);
    } else {
      // 页面加载时尝试恢复草稿
      const hasDraft = this.loadFromLocalStorage();
      if (hasDraft) {
        tt.showModal({
          title: '发现草稿',
          content: '检测到您有未完成的线路草稿，是否恢复？',
          success: (res) => {
            if (res.confirm) {
              // 用户确认恢复草稿，数据已经在 loadFromLocalStorage 中恢复了
              tt.showToast({
                title: '草稿已恢复',
                icon: 'success'
              });
            } else {
              // 用户不恢复草稿，清除草稿
              this.clearLocalStorage();
              this.setData({
                routeName: "",
                routeDescription: "",
                waypoints: [],
                selectedColor: '#1E90FF',
                userHasInteracted: false
              });
            }
          }
        });
      }
    }
  },

  // 加载路线详情（编辑模式）
  async loadRouteDetail(routeId: string) {
    try {
      tt.showLoading({ title: '加载中...' });
      const res = await request({
        url: '/api/tour-routes/detail',
        method: 'GET',
        data: { id: routeId }
      });

      if (res.code === 0 && res.data) {
        const routeDetail = res.data as RouteDetail;
        // 设置页面数据
        this.setData({
          routeName: routeDetail.name || '',
          routeDescription: routeDetail.description || '',
          waypoints: routeDetail.points || [],
          selectedColor: routeDetail.color || '#1E90FF',
          userHasInteracted: true,
          isEditMode: true,
          editRouteId: routeId,
          width: routeDetail.width
        });

        // 生成路线预览
        if (routeDetail.points && routeDetail.points.length > 0) {
          this.generateRoutePreview();
        }

        tt.showToast({
          title: '路线加载成功',
          icon: 'success'
        });
      } else {
        tt.showToast({
          title: (res as any).message || '加载路线失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('加载路线详情失败', error);
      tt.showToast({
        title: '网络请求失败，请重试',
        icon: 'error'
      });
    } finally {
      tt.hideLoading();
    }
  },

  // 线路名称输入
  onRouteNameInput(e: any) {
    this.setData({
      routeName: e.detail.value,
      userHasInteracted: true
    }, () => this.triggerSave())
  },

  // 线路描述输入
  onRouteDescriptionInput(e: any) {
    this.setData({
      routeDescription: e.detail.value,
      userHasInteracted: true
    }, () => this.triggerSave())
  },

  // 显示颜色选择器
  showColorPicker() {
    this.setData({
      showColorPickerModal: true
    });
  },

  // 颜色选择器颜色变化事件
  onColorChange(e: any) {
    const { color } = e.detail;
    this.setData({
      selectedColor: color
    }, () => this.triggerSave())
  },

  // 颜色选择器确认事件
  onColorConfirm(e: any) {
    const { color } = e.detail;
    this.setData({
      selectedColor: color,
      showColorPickerModal: false,
      userHasInteracted: true
    }, () => this.triggerSave())
    tt.showToast({
      title: '颜色选择成功',
      icon: 'success'
    });
  },

  // 颜色选择器关闭事件
  onColorPickerClose() {
    this.setData({
      showColorPickerModal: false
    });
  },

  // 选择快速颜色
  selectQuickColor(e: any) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      selectedColor: color,
      userHasInteracted: true
    }, () => this.triggerSave())
  },

  // 添加途经点
  addWaypoint() {
    this.setData({
      belowInsertWaypointIndex: -1,
      editingWaypointIndex: -1,
      editingWaypoint: {
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        showNameOnMap: true,
      },
      showWaypointModal: true,
      userHasInteracted: true
    });
  },

  // 编辑途经点
  editWaypoint(e: any) {
    const index = e.currentTarget.dataset.index;
    const waypoint = this.data.waypoints[index];
    this.setData({
      editingWaypointIndex: index,
      editingWaypoint: { ...waypoint },
      showWaypointModal: true,
      userHasInteracted: true
    });
  },

  // 删除途经点
  deleteWaypoint(e: any) {
    const index = e.currentTarget.dataset.index;
    tt.showModal({
      title: '确认删除',
      content: '确定要删除这个途经点吗？',
      success: (res) => {
        if (res.confirm) {
          const waypoints = [...this.data.waypoints];
          waypoints.splice(index, 1);
          this.setData({
            waypoints,
            userHasInteracted: true
          }, () => this.triggerSave())
        }
      }
    });
  },

  // 隐藏途经点编辑弹窗
  hideWaypointModal() {
    this.setData({
      showWaypointModal: false
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 途经点名称输入
  onWaypointNameInput(e: any) {
    this.setData({
      'editingWaypoint.name': e.detail.value
    });
  },

  // 选择位置
  selectLocation() {
    tt.chooseLocation({
      success: (res: any) => {
        const { name, address, latitude, longitude } = res;
        if (!this.data.editingWaypoint.name) {
          this.setData({
            'editingWaypoint.name': name,
          });
        }
        this.setData({
          'editingWaypoint.address': address || name,
          'editingWaypoint.latitude': Number(latitude),
          'editingWaypoint.longitude': Number(longitude)
        });
      },
      fail: (err: any) => {
        console.error('选择位置失败', err);
        if (err.errMsg.includes('auth deny')) {
          tt.showModal({
            title: '位置权限',
            content: '需要获取您的位置权限，请在小程序右上角设置中开启',
            showCancel: false
          });
        } else {
          tt.showToast({
            title: '选择位置失败',
            icon: 'none'
          });
        }
      }
    });
  },


  switch1Change(e: any) {
    this.setData({
      'editingWaypoint.showNameOnMap': e.detail.value
    });
  },

  // 确认途经点
  confirmWaypoint() {
    const { editingWaypoint, editingWaypointIndex, waypoints, belowInsertWaypointIndex } = this.data;
    // 验证必填项
    if (!editingWaypoint.name.trim()) {
      tt.showToast({
        title: '请输入途经点名称',
        icon: 'none'
      });
      return;
    }

    if (!editingWaypoint.address || !editingWaypoint.latitude || !editingWaypoint.longitude) {
      tt.showToast({
        title: '请选择途经点位置',
        icon: 'none'
      });
      return;
    }

    const newWaypoints = [...waypoints];


    if (belowInsertWaypointIndex !== -1) {
      // 点击下方插入途经点
      newWaypoints.splice(belowInsertWaypointIndex + 1, 0, { ...editingWaypoint });

    } else {
      if (editingWaypointIndex === -1) {
        // 新增途经点
        newWaypoints.push({ ...editingWaypoint });
      } else {
        // 编辑途经点
        newWaypoints[editingWaypointIndex] = { ...editingWaypoint };
      }

    }


    this.setData({
      editingWaypointIndex: -1,
      belowInsertWaypointIndex: -1,
      waypoints: newWaypoints,
      showWaypointModal: false,
      userHasInteracted: true
    }, () => this.triggerSave())

    tt.showToast({
      title: editingWaypointIndex === -1 ? '添加成功' : '编辑成功',
      icon: 'success'
    });
  },

  // 线路提交审核
  async saveRoute() {
    const { routeName, routeDescription, waypoints, selectedColor, isEditMode, editRouteId, width } = this.data;

    // 验证必填项
    if (!routeName.trim()) {
      tt.showToast({
        title: '请输入线路名称',
        icon: 'none'
      });
      return;
    }

    if (waypoints.length < 2) {
      tt.showToast({
        title: '至少需要2个途经点',
        icon: 'none'
      });
      return;
    }

    // 验证所有途经点都有位置信息
    const invalidWaypoints = waypoints.filter(wp => !wp.address || !wp.latitude || !wp.longitude);
    if (invalidWaypoints.length > 0) {
      tt.showToast({
        title: '请完善所有途经点信息',
        icon: 'none'
      });
      return;
    }

    tt.showLoading({
      title: isEditMode ? '保存中...' : '提交中...'
    });

    try {
      // 构建线路数据
      const routeData = {
        name: routeName.trim(),
        description: routeDescription.trim(),
        color: selectedColor,
        width: width || null,
        points: waypoints.map((wp, index) => ({
          ...wp,
          order: index + 1
        }))
      };

      let res;
      if (isEditMode) {
        // 编辑模式：调用更新接口
        res = await request({
          url: '/api/tour-routes/update',
          method: 'POST',
          data: { ...routeData, routeId: editRouteId }
        });
      } else {
        // 新建模式：调用添加接口
        res = await request({
          url: '/api/tour-routes/add',
          method: 'POST',
          data: routeData
        });
      }

      if (res.code === 0) {
        tt.hideLoading();
        tt.showToast({
          title: isEditMode ? (res.msg || '修改成功') : (res.msg || '提交成功'),
          icon: 'none'
        });

        // 保存成功后清除草稿
        this.clearLocalStorage();

        // 延迟返回上一页
        setTimeout(() => {
          tt.navigateBack();
        }, 1500);
      } else {
        throw new Error((res as any).msg || (isEditMode ? '修改失败' : '保存失败'));
      }
    } catch (error: any) {
      tt.hideLoading();
      console.error('保存线路失败', error);
      tt.showToast({
        title: error?.msg || '保存失败',
        icon: 'none'
      });
    }
  },

  // 取消
  cancel() {
    tt.navigateBack();
  },

  // 地图预览相关方法
  showRoutePreview() {
    if (this.data.waypoints.length === 0) {
      tt.showToast({
        title: '请先添加途经点',
        icon: 'none'
      });
      return;
    }

    // 先设置弹框显示状态
    this.setData({
      showMapPreview: true
    });

    // 延迟一帧生成预览数据，确保弹框已渲染
    tt.nextTick(() => {
      this.generateRoutePreview();
    });
  },

  hideMapPreview() {
    this.setData({
      showMapPreview: false
    });
  },

  // 生成路线预览数据
  generateRoutePreview() {
    const { waypoints, selectedColor, width } = this.data;

    if (waypoints.length === 0) return;

    // 生成标记点
    const markers = waypoints.map((waypoint, index) => ({
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
        bgColor: selectedColor,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ffffff'
      }
    }));

    // 生成连线
    const polyline = [{
      points: waypoints.map(wp => ({
        latitude: wp.latitude,
        longitude: wp.longitude
      })),
      color: selectedColor,
      width: width || 2,
      arrowLine: true,
      textStyle: {
        textColor: '#ffffff',
        strokeColor: '#000000',
        fontSize: 14
      }
    }];

    // 计算地图中心点和合适的缩放级别
    const { center, scale } = this.calculateOptimalMapView(waypoints);

    this.setData({
      routeMarkers: markers,
      routePolyline: polyline,
      mapCenter: center,
      mapScale: scale
    });
  },

  // 计算最优地图视图（中心点和缩放级别）
  calculateOptimalMapView(waypoints: any[]) {
    if (waypoints.length === 0) {
      return {
        center: { latitude: 39.91, longitude: 116.40 },
        scale: 10
      };
    }

    if (waypoints.length === 1) {
      return {
        center: {
          latitude: waypoints[0].latitude,
          longitude: waypoints[0].longitude
        },
        scale: 12
      };
    }

    // 计算所有点的边界
    let minLat = waypoints[0].latitude;
    let maxLat = waypoints[0].latitude;
    let minLng = waypoints[0].longitude;
    let maxLng = waypoints[0].longitude;

    waypoints.forEach(wp => {
      minLat = Math.min(minLat, wp.latitude);
      maxLat = Math.max(maxLat, wp.latitude);
      minLng = Math.min(minLng, wp.longitude);
      maxLng = Math.max(maxLng, wp.longitude);
    });

    // 计算中心点
    const center = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2
    };

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

    return { center, scale };
  },

  // 标记点点击事件
  onMarkerTap(e: any) {
    const markerId = e.markerId;
    const waypoint = this.data.waypoints[markerId];

    if (waypoint) {
      tt.showToast({
        title: `${markerId + 1}. ${waypoint.name || '途经点'}`,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 地图缩放控制
  zoomInMap() {
    const newScale = Math.min(this.data.mapScale + 2, 20);
    this.setData({
      mapScale: newScale
    });
  },

  zoomOutMap() {
    const newScale = Math.max(this.data.mapScale - 2, 3);
    this.setData({
      mapScale: newScale
    });
  },

  // 重置地图视图
  resetMapView() {
    if (this.data.waypoints.length > 0) {
      this.generateRoutePreview();
    }
  },

  // 途经点排序相关方法
  // 上移途经点
  moveWaypointUp(e: any) {
    const index = e.currentTarget.dataset.index;
    if (index > 0) {
      this.reorderWaypoints(index, index - 1);
    }
  },

  // 下移途经点
  moveWaypointDown(e: any) {
    const index = e.currentTarget.dataset.index;
    if (index < this.data.waypoints.length - 1) {
      this.reorderWaypoints(index, index + 1);
    }
  },

  // 重新排序途经点
  reorderWaypoints(fromIndex: number, toIndex: number) {
    const waypoints = [...this.data.waypoints];
    const [removed] = waypoints.splice(fromIndex, 1);
    waypoints.splice(toIndex, 0, removed);

    this.setData({
      waypoints,
      userHasInteracted: true
    }, () => this.triggerSave())

    tt.showToast({
      title: '排序已更新',
      icon: 'success',
      duration: 1000
    });
  },

  // 线路类型- 实际宽度 
  handleRouteWidthChange(event: any) {
    const routeLinewidth = Number(event.detail.value);
    this.setData({ width: routeLinewidth }, () => this.triggerSave());
  },

  // 下方插入
  insertWaypointInBelow(event: any) {
    const belowInsertWaypointIndex = event.currentTarget.dataset.index;
    this.setData({
      belowInsertWaypointIndex,
      editingWaypointIndex: -1,
      editingWaypoint: {
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        showNameOnMap: true,
      },
      showWaypointModal: true,
      userHasInteracted: true
    });
  }
});
