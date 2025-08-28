// 全局Toast实例
let toastInstance: any = null;

// Toast配置接口
interface ToastOptions {
  title: string;
  icon?: 'success' | 'error' | 'loading' | 'none';
  image?: string;
  duration?: number;
  mask?: boolean;
  success?: () => void;
  fail?: () => void;
  complete?: () => void;
}

// 自定义Toast类
class CustomToast {
  private instance: any = null;

  // 设置Toast实例
  setInstance(instance: any) {
    this.instance = instance;
  }

  // 显示Toast
  show(options: ToastOptions | string) {
    if (!this.instance) {
      console.warn('Toast实例未初始化，请确保在页面中使用了custom-toast组件');
      return;
    }

    let config: any = {};

    if (typeof options === 'string') {
      config = {
        title: options,
        icon: 'none',
        duration: 2000
      };
    } else {
      config = {
        icon: options.icon || 'none',
        duration: options.duration || 2000,
        ...options
      };
    }

    // 根据icon类型设置不同的显示方式
    if (config.icon === 'success') {
      this.instance.success(config.title, config.duration);
    } else if (config.icon === 'error') {
      this.instance.error(config.title, config.duration);
    } else if (config.icon === 'loading') {
      this.instance.info(config.title, config.duration);
    } else {
      this.instance.show({
        title: config.title,
        icon: '',
        iconType: 'text',
        type: 'default',
        duration: config.duration
      });
    }

    // 执行回调
    if (config.success) {
      setTimeout(config.success, config.duration);
    }
    if (config.complete) {
      setTimeout(config.complete, config.duration);
    }
  }

  // 隐藏Toast
  hide() {
    if (this.instance) {
      this.instance.hide();
    }
  }

  // 成功提示
  success(title: string, duration?: number) {
    this.show({
      title,
      icon: 'success',
      duration: duration || 2000
    });
  }

  // 错误提示
  error(title: string, duration?: number) {
    this.show({
      title,
      icon: 'error',
      duration: duration || 2000
    });
  }

  // 加载提示
  loading(title: string, duration?: number) {
    this.show({
      title,
      icon: 'loading',
      duration: duration || 2000
    });
  }

  // 普通提示
  info(title: string, duration?: number) {
    this.show({
      title,
      icon: 'none',
      duration: duration || 2000
    });
  }
}

// 创建全局Toast实例
const customToast = new CustomToast();

// 导出Toast实例
export const showToast = (options: ToastOptions | string) => {
  customToast.show(options);
};

export const hideToast = () => {
  customToast.hide();
};

export const showSuccess = (title: string, duration?: number) => {
  customToast.success(title, duration);
};

export const showError = (title: string, duration?: number) => {
  customToast.error(title, duration);
};

export const showLoading = (title: string, duration?: number) => {
  customToast.loading(title, duration);
};

export const showInfo = (title: string, duration?: number) => {
  customToast.info(title, duration);
};

// 设置Toast实例的方法（在页面中使用）
export const setToastInstance = (instance: any) => {
  customToast.setInstance(instance);
};

export default customToast; 