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
      tt.chooseLocation({
        success: (res: any) => {
          console.log(TAG, 'tt.chooseLocation success', res)
          const { name, address, latitude, longitude } = res;
          this.setData({ searchQuery: name || address });
          this.triggerEvent("chooseLocation", {
            ...res,
            latitude: Number(latitude),
            longitude: Number(longitude),
          });
        },
        fail: (error) => {
          console.log(TAG, 'tt.chooseLocation fail', error)
          this.setData({ searchQuery: '' });
        },
        complete: (res) => {
          console.log(TAG, 'tt.chooseLocation complete', res)
        }
      })
    },
    onFilterTap(e: any) {
      this.triggerEvent("onFilterTap", e.currentTarget.dataset);
    }
  }
})