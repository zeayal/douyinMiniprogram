// components/search-bar/search-bar.ts
const TAG = 'components/search-bar/search-bar.ts';

Component({

  /**
   * 组件的属性列表
   */
  properties: {
    filterType: {
      type: String
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    searchQuery: '',
  },

  /**
   * 组件的方法列表
   */
  methods: {
    clickSearch() {
      wx.chooseLocation({
        success: (res: any) => {
          console.log(TAG, 'wx.chooseLocation success', res)
          const { name } = res;
          this.setData({ searchQuery: name });
          this.triggerEvent("chooseLocation", res);
        },
        fail: (error) => {
          console.log(TAG, 'wx.chooseLocation fail', error)
          this.setData({ searchQuery: '' });
        },
        complete: (res) => {
          console.log(TAG, 'wx.chooseLocation complete', res)
        }
      })
    },
    onFilterTap(e: any) {
      this.triggerEvent("onFilterTap", e.currentTarget.dataset);
    }
  }
})