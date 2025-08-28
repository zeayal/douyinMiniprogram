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
        tt.navigateTo({
          url: "/pages/collection/collection?type=collection&title=我的收藏",
        });
        break;
      case "checkin":
        tt.navigateTo({
          url: "/pages/collection/collection?type=checkin&title=我的打卡",
        });
        break;
      case "camp":
        tt.navigateTo({
          url: "/pages/collection/collection?type=camp&title=我的营地",
        });
        break;

      case "addCamp":
        tt.navigateTo({
          url: "/pages/add/add",
        });
        break;
    }
  },

  handleMenuTapItem(e) {
    const type = e.currentTarget.dataset.type;
    switch (type) {
      case "order":
        tt.navigateTo({
          url: "/pages/order/order",
        });
        break;
      case "feedback":
        tt.navigateTo({
          url: "/pages/feedback/feedback",
        });
        break;

      case "about":
        tt.navigateTo({
          url: "/pages/about/about",
        });
        break;
    }

  },

  // 处理会员购买
  handleBuyVip: function () {
    // tt.showToast({
    //   title: "目前免费使用阶段，有任何建议可通过“意见反馈”告知",
    //   icon: "none",
    // });
    tt.navigateTo({
      url: "/pages/vip/vip"
    })
  },
  /**
 * 跳转到FAQ页面
 */
  navigateToFaq() {
    tt.navigateTo({
      url: '/pages/faq/faq'
    });
  }
});
