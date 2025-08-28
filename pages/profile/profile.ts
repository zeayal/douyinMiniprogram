import { getUserInfo } from "../../utils/api";
import { isIOS } from '../../utils/device';


Page({
  data: {
    isIos: isIOS(),
    isLoading: true,
    userInfo: {
      nickname: "",
      isVip: false,
    },
  },
  onLoad: async function () {
    try {
      const userInfo = await getUserInfo() || {};
      this.setData({
        userInfo: {
          ...userInfo,
          isVip: true
        }
      })
    } finally {
      this.setData({
        isLoading: false
      })
    }
  },

  // 处理点击菜单项
  handleMenuTap: function (e) {
    // if (!checkIsVip('更多')) {
    //   return
    // }
    const type = e.currentTarget.dataset.type;
    switch (type) {
      case "collection":
        wx.navigateTo({
          url: "/pages/collection/collection?type=collection&title=我的收藏",
        });
        break;
      case "checkin":
        wx.navigateTo({
          url: "/pages/collection/collection?type=checkin&title=我的打卡",
        });
        break;
      case "camp":
        wx.navigateTo({
          url: "/pages/collection/collection?type=camp&title=我的营地",
        });
        break;

      case "addCamp":
        wx.navigateTo({
          url: "/pages/add/add",
        });
        break;
    }
  },

  handleMenuTapItem(e) {
    const type = e.currentTarget.dataset.type;
    switch (type) {
      case "order":
        wx.navigateTo({
          url: "/pages/order/order",
        });
        break;
      case "feedback":
        wx.navigateTo({
          url: "/pages/feedback/feedback",
        });
        break;

      case "about":
        wx.navigateTo({
          url: "/pages/about/about",
        });
        break;
    }

  },

  // 处理会员购买
  handleBuyVip: function () {
    // wx.showToast({
    //   title: "目前免费使用阶段，有任何建议可通过“意见反馈”告知",
    //   icon: "none",
    // });
    wx.navigateTo({
      url: "/pages/vip/vip"
    })
  },
  /**
 * 跳转到FAQ页面
 */
  navigateToFaq() {
    wx.navigateTo({
      url: '/pages/faq/faq'
    });
  }
});
