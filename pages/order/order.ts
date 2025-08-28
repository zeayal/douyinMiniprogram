import { request } from "../../utils/http";
import { formatTime } from "../../utils/util";

// pages/order/order.ts
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLoading: true,
    orders: [],
    page: 1,
    pageSize: 10,
    hasMore: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.setData({
      isLoading: true
    })
    this.fetchOrderList();
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.setData({
      page: 1
    }, () => {
      this.fetchOrderList();
    })
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    const { page, hasMore } = this.data;

    if (hasMore) {
      this.setData({
        page: page + 1
      }, () => {
        this.fetchOrderList()
      })
    }

  },

  async fetchOrderList() {
    try {
      tt.showLoading({
        title: '加载中'
      })
      const { page, pageSize } = this.data;
      const res = await request({
        url: '/api/users/orders',
        method: 'GET',
        data: {
          page,
          pageSize
        }
      });
      let list = [];
      if (res.code === 0) {
        const { hasMore } = res.data;
        if (page === 1) {
          list = res.data.list
        } else {
          list = [...this.data.orders, ...res.data.list];
        }


        this.setData({
          hasMore,
          orders: list.map(item => {
            return {
              ...item,
              createdAt: formatTime(new Date(item.createdAt))
            }
          })
        })
      }

    } finally {
      tt.hideLoading();
      tt.stopPullDownRefresh()
      this.setData({
        isLoading: false
      })
    }
  },

  handleClickItem(e) {
    const orderNo = e.currentTarget.dataset.orderno
    tt.navigateTo({
      url: '/pages/orderDetail/orderDetail?orderNo=' + orderNo
    })
  }



})