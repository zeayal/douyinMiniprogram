# 自定义Toast组件使用说明

## 组件特性

### ✅ **完全兼容微信Toast API**
- 使用方式与 `tt.showToast` 完全一致
- 支持所有原有参数和回调函数
- 完美支持换行显示

### ✅ **增强功能**
- 支持多种状态样式（成功、错误、警告、信息）
- 支持自定义图标（文字或图片）
- 支持多行文本显示
- 支持自定义样式和动画

### ✅ **完全可控**
- 可以自定义显示位置、样式、动画
- 支持手动控制显示和隐藏
- 支持自定义持续时间

## 安装和配置

### 1. 在页面JSON中注册组件
```json
{
  "usingComponents": {
    "custom-toast": "../../components/custom-toast/custom-toast"
  }
}
```

### 2. 在页面WXML中添加组件
```xml
<custom-toast id="customToast"></custom-toast>
```

### 3. 在页面TS中初始化
```typescript
import { setToastInstance, showToast } from '../../utils/toast';

Page({
  onLoad() {
    // 初始化自定义Toast
    this.initCustomToast();
  },

  initCustomToast() {
    const toastComponent = this.selectComponent('#customToast');
    if (toastComponent) {
      setToastInstance(toastComponent);
    }
  }
});
```

## 使用方法

### 1. 基本使用（与tt.showToast完全一致）
```typescript
// 字符串形式
showToast('操作成功');

// 对象形式
showToast({
  title: '操作成功',
  icon: 'success',
  duration: 2000
});

// 支持换行
showToast({
  title: '第一行\n第二行\n第三行',
  icon: 'none',
  duration: 3000
});
```

### 2. 快捷方法
```typescript
import { showSuccess, showError, showInfo, showLoading } from '../../utils/toast';

// 成功提示
showSuccess('操作成功');

// 错误提示
showError('操作失败');

// 信息提示
showInfo('提示信息');

// 加载提示
showLoading('加载中...');
```

### 3. 手动控制
```typescript
import { hideToast } from '../../utils/toast';

// 手动隐藏
hideToast();
```

## 完整示例

### 在map页面中的使用
```typescript
// 导入Toast工具
import { setToastInstance, showToast } from '../../utils/toast';

Page({
  onLoad() {
    // 初始化Toast
    this.initCustomToast();
  },

  initCustomToast() {
    const toastComponent = this.selectComponent('#customToast');
    if (toastComponent) {
      setToastInstance(toastComponent);
    }
  },

  onFilterTap(e: any) {
    const type = e.currentTarget.dataset.type;
    const title = e.currentTarget.dataset.title;
    
    if (type !== this.data.filterType) {
      if (type !== 'all') {
        this.data._allSpots = []
      }
      
      this.setData({ filterType: type }, () => {
        const { latitude, longitude } = this.data.centerLocation;
        this.getList({ latitude, longitude, scale: this.data.scale }, 'onFilterTap');
        
        // 使用自定义Toast，完美支持换行
        title && showToast({
          title: `${title}\n请以具体详情为准`,
          icon: "none",
          duration: 2000,
        });
      });
    }
  }
});
```

## 样式定制

### 1. 修改组件样式
在 `custom-toast.scss` 中可以自定义：
- 背景颜色和透明度
- 文字大小和颜色
- 圆角和阴影
- 动画效果
- 不同状态的样式

### 2. 使用CSS变量
```scss
.custom-toast {
  --toast-bg-color: rgba(0, 0, 0, 0.8);
  --toast-text-color: #fff;
  --toast-border-radius: 12rpx;
  --toast-padding: 24rpx 32rpx;
}
```

## 优势对比

### 相比原生tt.showToast的优势：

1. **完美支持换行**：
   - 原生Toast换行可能不生效
   - 自定义Toast完美支持 `\n` 换行

2. **样式可控**：
   - 原生Toast样式固定
   - 自定义Toast可以完全定制

3. **功能增强**：
   - 支持多种状态样式
   - 支持自定义图标
   - 支持手动控制

4. **兼容性好**：
   - API完全兼容原生Toast
   - 可以无缝替换

## 注意事项

1. **初始化时机**：确保在 `onLoad` 中初始化Toast实例
2. **组件ID**：确保组件ID为 `customToast`
3. **导入路径**：确保导入路径正确
4. **样式覆盖**：可以通过CSS变量或直接修改样式文件来自定义外观

## 扩展功能

### 1. 添加更多状态
```typescript
// 在custom-toast.ts中添加新状态
warning(title: string, duration?: number) {
  this.show({
    title,
    icon: '⚠',
    iconType: 'text',
    type: 'warning',
    duration
  });
}
```

### 2. 添加自定义动画
```scss
.custom-toast {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

### 3. 添加位置控制
```typescript
// 可以扩展支持不同位置
showToast({
  title: '提示信息',
  position: 'top', // 'top', 'center', 'bottom'
  duration: 2000
});
``` 