// components/facility-info/facility-info.ts
Component({
  data: {
    visible: false
  },

  methods: {
    showModal() {
      this.setData({
        visible: true
      });
    },

    hideModal() {
      this.setData({
        visible: false
      });
    },

    stopPropagation() {
      // 阻止事件冒泡
    }
  }
});
