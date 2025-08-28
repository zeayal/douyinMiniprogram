Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    icon: {
      type: String,
      value: ''
    },
    iconType: {
      type: String,
      value: 'text', // 'text' 或 'image'
      options: ['text', 'image']
    },
    type: {
      type: String,
      value: 'default', // 'default', 'success', 'error', 'warning', 'info'
      options: ['default', 'success', 'error', 'warning', 'info']
    },
    duration: {
      type: Number,
      value: 2000
    }
  },

  data: {
    textLines: [] as string[]
  },

  observers: {
    'title': function(title: string) {
      if (title) {
        // 将文本按换行符分割
        const lines = title.split(/\r?\n/);
        this.setData({
          textLines: lines
        });
      }
    }
  },

  methods: {
    // 显示Toast
    show(options: {
      title: string;
      icon?: string;
      iconType?: 'text' | 'image';
      type?: 'default' | 'success' | 'error' | 'warning' | 'info';
      duration?: number;
    }) {
      const {
        title,
        icon = '',
        iconType = 'text',
        type = 'default',
        duration = 2000
      } = options;

      this.setData({
        visible: true,
        title,
        icon,
        iconType,
        type
      });

      // 自动隐藏
      if (duration > 0) {
        setTimeout(() => {
          this.hide();
        }, duration);
      }
    },

    // 隐藏Toast
    hide() {
      this.setData({
        visible: false
      });
    },

    // 成功提示
    success(title: string, duration?: number) {
      this.show({
        title,
        icon: '✓',
        iconType: 'text',
        type: 'success',
        duration
      });
    },

    // 错误提示
    error(title: string, duration?: number) {
      this.show({
        title,
        icon: '✕',
        iconType: 'text',
        type: 'error',
        duration
      });
    },

    // 警告提示
    warning(title: string, duration?: number) {
      this.show({
        title,
        icon: '⚠',
        iconType: 'text',
        type: 'warning',
        duration
      });
    },

    // 信息提示
    info(title: string, duration?: number) {
      this.show({
        title,
        icon: 'ℹ',
        iconType: 'text',
        type: 'info',
        duration
      });
    }
  }
}); 