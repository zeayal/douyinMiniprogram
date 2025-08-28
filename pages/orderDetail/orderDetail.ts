// pages/orderDetail/orderDetail.ts
import { request } from "../../utils/http";
import { formatTime } from "../../utils/util";


interface OrderDetail {
  id: string,
  orderNo: string,
  totalFee: number,
  status: string,
  transactionId?: string,
  paidAt?: Date,
  expiredAt: Date,
  phone?: string,
  userName?: string,
  address?: string,
  logisticsCompany?: string,
  trackingNumber?: string,
  plan: {
    name: string,
    durationDays: number,
    price: number,
    originalPrice?: number,
    products: [
      {
        product: {
          id: string,
          title: string,
          imageUrl: string
        }
      }
    ]
  },
  paymentLogs: [
    {
      type: string,
      message?: string,
      createdAt: Date
    }
  ]
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLoading: true,
    orderDetail: null as OrderDetail | null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { orderNo } = options;
    if (orderNo) {
      this.getOrderDetail(orderNo);
    } else {
      wx.showToast({
        icon: 'error',
        title: '未传递订单号'
      })
    }

  },

  async getOrderDetail(orderNo: string) {

    try {
      const res = await request({
        url: '/api/users/orderDetail',
        method: 'GET',
        data: {
          orderNo
        }
      })
      if (res.code === 0) {
        const data = res.data;
        const { createdAt } = data;
        this.setData({
          orderDetail: {
            ...data,
            createdAt: formatTime(new Date(createdAt))
          }
        })
      }

    } finally {
      this.setData({
        isLoading: false
      })
    }


  }

})
