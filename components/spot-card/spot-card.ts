import { request } from "../../utils/http";

// components/spot-card/spot-card.ts
Component({
  properties: {
    showSpotCard: {
      type: Boolean,
      value: false,
    },
    selectedSpot: {
      type: Object,
      value: {},
    },
    selectedSpotId: {
      type: String,
      value: '',
    }
  },
  data: {
    isLoaded: false,
    isCollected: false,
    selectedSpotCoverImage: '',
    isLoadingDetail: false
  },
  observers: {
    'selectedSpotId': function (newId) {
      this.getCoverImage(newId);
      this.checkCollectionStatus(newId);
    }
  },
  methods: {
    // 检查收藏状态（调用后端接口）
    async checkCollectionStatus(spotId: string) {
      if (spotId) {
        const res = await request<any>({
          url: `/api/parking_spots/siteCampCollectStatus`,
          method: "GET",
          data: { id: spotId },
        });
        if (res.code === 0) {
          this.setData({ isCollected: res.data.isCollected });
        }
      }
    },
    async getCoverImage(newId) {
      if (newId) {
        try {
          //  detailId 查找封面
          this.setData({ isLoadingCoverImage: true })
          const res = await request({
            url: "/api/parking_spots/getCoverImage",
            method: "GET",
            data: {
              id: newId
            },
          });
          if (res?.code === 0) {
            const { coverImage } = res.data;
            this.setData({
              selectedSpotCoverImage: coverImage,
            });
          }
        } catch (e) {
          console.log('请求封面图片报错', e)
        } finally {
          this.setData({ isLoadingCoverImage: false })
        }
      }

    },
    handleCardTap() {
      const spot = this.data.selectedSpot;
      this.triggerEvent("navigateToDetail", { id: spot.id });
    },

    handleNavTap() {
      const spot = this.data.selectedSpot;
      this.triggerEvent("navigateToSpot", { id: spot.id });
    },

    handleCloseCardTap() {
      this.triggerEvent('closeSoptCard', {}) // 只会触发 pageEventListener2
    },

    onImageLoad() {
      this.setData({
        isLoaded: true
      })
    },

    // 收藏/取消收藏（调用后端接口）
    async handleFavTap() {
      const spot = this.data.selectedSpot;
      const { isCollected } = this.data;

      try {
        let res: any;
        if (!isCollected) {
          // 添加收藏
          res = await request({
            url: `/api/parking_spots/collect`,
            method: "POST",
            data: { id: spot.id },
          });
        } else {
          // 取消收藏
          res = await request({
            url: `/api/parking_spots/uncollect`,
            method: "POST",
            data: { id: spot.id },
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
        console.log("收藏操作失败:", error);
        tt.showToast({ title: "网络请求失败", icon: "none" });
      }
    }
  },
});
