Component({
  properties: {
    value: {
      type: String,
      value: '#1E90FF'
    },
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    selectedColor: '#1E90FF',
    hsvColor: { h: 210, s: 88, v: 100 }, // 更新为蓝色的HSV值
    hexInput: '1E90FF',
    rgbInput: { r: 30, g: 144, b: 255 }, // 更新为蓝色的RGB值
    showAdvanced: false,
    colorHistory: ['#1E90FF', '#FF69B4', '#20B2AA', '#FFA500'],
    
    // 预设颜色 - 使用优化的安全颜色
    presetColors: [
      '#1E90FF', '#00BFFF', '#87CEEB', '#4682B4', // 蓝色系
      '#20B2AA', '#48D1CC', '#7FFFD4', '#00CED1', // 青色系
      '#FF69B4', '#FFB6C1', '#FFC0CB', '#FF1493', // 粉色系
      '#FFA500', '#FF7F50', '#FF6347', '#FF4500'  // 橙色系
    ],
    
    // 颜色分类 - 使用优化的颜色，确保颜色间有足够差异
    colorCategories: [
      { name: 'warm', label: '暖色系', colors: ['#FF69B4', '#FFB6C1', '#FFC0CB', '#FF1493', '#FFA500', '#FF7F50', '#FF6347', '#FF4500'] },
      { name: 'cool', label: '冷色系', colors: ['#1E90FF', '#00BFFF', '#87CEEB', '#4682B4', '#20B2AA', '#48D1CC', '#7FFFD4', '#00CED1'] },
      { name: 'bright', label: '明亮色', colors: ['#FFD700', '#FFFF00', '#FFEFD5', '#F0E68C', '#9370DB', '#8A2BE2', '#DA70D6', '#DDA0DD'] },
      { name: 'neutral', label: '中性色', colors: ['#32CD32', '#00FA9A', '#98FB98', '#90EE90', '#ADFF2F', '#9ACD32', '#6B8E23', '#556B2F'] }
    ],
    activeCategory: 'cool',
    activeCategoryColors: ['#1E90FF', '#00BFFF', '#87CEEB', '#4682B4', '#20B2AA', '#48D1CC', '#7FFFD4', '#00CED1']
  },

  lifetimes: {
    attached() {
      this.initColor();
    }
  },

  observers: {
    'value': function(newVal) {
      if (newVal && newVal !== this.data.selectedColor) {
        this.setData({ selectedColor: newVal });
        this.updateColorFromHex(newVal);
      }
    }
  },

  methods: {
    // 初始化颜色
    initColor() {
      const color = this.data.value || '#1E90FF';
      this.updateColorFromHex(color);
    },

    // 选择预设颜色
    selectPresetColor(e: any) {
      const color = e.currentTarget.dataset.color;
      this.updateColor(color);
    },

    // 选择分类颜色
    selectCategoryColor(e: any) {
      const color = e.currentTarget.dataset.color;
      this.updateColor(color);
    },

    // 切换分类
    selectCategory(e: any) {
      const categoryName = e.currentTarget.dataset.category;
      const category = this.data.colorCategories.find(cat => cat.name === categoryName);
      if (category) {
        this.setData({
          activeCategory: categoryName,
          activeCategoryColors: category.colors
        });
      }
    },

    // 选择快速颜色
    selectQuickColor(e: any) {
      const color = e.currentTarget.dataset.color;
      this.updateColor(color);
    },

    // 更新颜色
    updateColor(color: string) {
      this.setData({ selectedColor: color });
      this.updateColorFromHex(color);
      this.addToHistory(color);
      this.triggerEvent('change', { color });
    },

    // 从十六进制更新颜色
    updateColorFromHex(hex: string) {
      const hsv = this.hexToHsv(hex);
      const rgb = this.hexToRgb(hex);
      const hexInput = hex.substring(1);
      
      this.setData({
        hsvColor: hsv,
        rgbInput: rgb,
        hexInput: hexInput
      });
    },

    // 十六进制输入处理
    onHexInput(e: any) {
      const value = e.detail.value;
      this.setData({ hexInput: value });
    },

    // 应用十六进制颜色
    applyHexColor() {
      const hexInput = this.data.hexInput;
      if (/^[0-9A-Fa-f]{3,6}$/.test(hexInput)) {
        let hex = hexInput;
        if (hex.length === 3) {
          // 3位转6位
          hex = hex.split('').map(c => c + c).join('');
        }
        const color = '#' + hex.toUpperCase();
        this.updateColor(color);
      } else {
        tt.showToast({
          title: '请输入有效的颜色值',
          icon: 'none'
        });
      }
    },

    // RGB输入处理
    onRgbInput(e: any) {
      const { field } = e.currentTarget.dataset;
      const value = parseInt(e.detail.value) || 0;
      const rgb = { ...this.data.rgbInput };
      rgb[field] = Math.max(0, Math.min(255, value));
      
      this.setData({ rgbInput: rgb });
      const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
      this.updateColor(hex);
    },

    // HSV变化处理
    onHueChange(e: any) {
      const h = e.detail.value;
      const { s, v } = this.data.hsvColor;
      this.updateHsvColor(h, s, v);
    },

    onSaturationChange(e: any) {
      const s = e.detail.value;
      const { h, v } = this.data.hsvColor;
      this.updateHsvColor(h, s, v);
    },

    onValueChange(e: any) {
      const v = e.detail.value;
      const { h, s } = this.data.hsvColor;
      this.updateHsvColor(h, s, v);
    },

    // 更新HSV颜色
    updateHsvColor(h: number, s: number, v: number) {
      this.setData({ hsvColor: { h, s, v } });
      const hex = this.hsvToHex(h, s, v);
      this.updateColor(hex);
    },

    // 添加到历史记录
    addToHistory(color: string) {
      let history = [...this.data.colorHistory];
      if (!history.includes(color)) {
        history.unshift(color);
        if (history.length > 10) {
          history = history.slice(0, 10);
        }
        this.setData({ colorHistory: history });
      }
    },



    // 切换高级模式
    toggleAdvanced() {
      this.setData({ showAdvanced: !this.data.showAdvanced });
    },

    // 关闭选择器
    close() {
      this.triggerEvent('close');
    },

    // 确认选择
    confirm() {
      this.triggerEvent('confirm', { color: this.data.selectedColor });
    },

    // HSV转十六进制
    hsvToHex(h: number, s: number, v: number): string {
      const c = (v / 100) * (s / 100);
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = (v / 100) - c;
      
      let r = 0, g = 0, b = 0;
      
      if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
      } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
      } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
      } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
      } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
      } else {
        r = c; g = 0; b = x;
      }
      
      const red = Math.round((r + m) * 255);
      const green = Math.round((g + m) * 255);
      const blue = Math.round((b + m) * 255);
      
      return '#' + [red, green, blue].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('').toUpperCase();
    },

    // 十六进制转HSV
    hexToHsv(hex: string): { h: number, s: number, v: number } {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { h: 0, s: 0, v: 0 };
      
      const r = parseInt(result[1], 16) / 255;
      const g = parseInt(result[2], 16) / 255;
      const b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      
      let h = 0;
      if (diff === 0) {
        h = 0;
      } else if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
      
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      
      const s = max === 0 ? 0 : Math.round((diff / max) * 100);
      const v = Math.round(max * 100);
      
      return { h, s, v };
    },

    // 十六进制转RGB
    hexToRgb(hex: string): { r: number, g: number, b: number } {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { r: 0, g: 0, b: 0 };
      
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      };
    },

    // RGB转十六进制
    rgbToHex(r: number, g: number, b: number): string {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('').toUpperCase();
    }
  }
});
