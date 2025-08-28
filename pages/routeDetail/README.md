# 路线详情页面

## 功能说明

路线详情页面用于显示旅游路线的详细信息，包括：

1. **路线基本信息**：名称、描述、颜色标识
2. **路线统计**：途经点数量、总距离、预计用时
3. **地图预览**：可交互的地图显示路线和途经点
4. **途经点列表**：详细的途经点信息
5. **详细信息**：难度等级、最佳季节、注意事项等

## 页面跳转

从旅游线路弹窗中点击任意线路卡片，会跳转到此页面并传递路线ID参数：

```typescript
wx.navigateTo({
  url: `/pages/routeDetail/routeDetail?id=${route.id}`
});
```

## API 接口

页面加载时会调用以下接口获取路线详情：

- **接口地址**：`/api/tour-routes/detail`
- **请求方法**：GET
- **请求参数**：`{ id: string }`
- **响应数据**：路线详细信息

## 数据结构

```typescript
interface RouteDetail {
  id: string;
  name: string;
  description: string;
  color: string;
  points: RoutePoint[];
  totalDistance?: number;
  estimatedTime?: number;
  difficulty?: string;
  bestSeason?: string;
  notes?: string;
}

interface RoutePoint {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}
```

## 地图功能

页面内置地图预览功能，支持：

- 显示路线和途经点
- 地图缩放控制
- 重置视图
- 标记点点击交互

## 样式特点

- 渐变背景的头部设计
- 卡片式布局
- 响应式设计
- 现代化的UI风格
