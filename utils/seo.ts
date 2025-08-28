// utils/seo.ts

/**
 * SEO工具类
 */
export class SEOUtils {
  
  /**
   * 生成SEO友好的标题
   */
  static generateTitle(baseTitle: string, keywords: string[] = []): string {
    const baseKeywords = ['户外露营', '房车营地', '自驾攻略', '免费露营地'];
    const allKeywords = [...baseKeywords, ...keywords];
    const keywordString = allKeywords.slice(0, 3).join('、');
    return `${baseTitle} - ${keywordString} | 全国10万+免费露营地`;
  }

  /**
   * 生成SEO友好的描述
   */
  static generateDescription(content: string, maxLength: number = 160): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * 生成结构化数据
   */
  static generateStructuredData(data: {
    name: string;
    description: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
    rating?: number;
    reviewCount?: number;
    priceRange?: string;
    amenities?: string[];
  }) {
    const structuredData: any = {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      "name": data.name,
      "description": data.description,
    };

    if (data.latitude && data.longitude) {
      structuredData.geo = {
        "@type": "GeoCoordinates",
        "latitude": data.latitude,
        "longitude": data.longitude
      };
    }

    if (data.images && data.images.length > 0) {
      structuredData.image = data.images;
    }

    if (data.rating) {
      structuredData.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": data.rating,
        "reviewCount": data.reviewCount || 0
      };
    }

    if (data.priceRange) {
      structuredData.priceRange = data.priceRange;
    }

    if (data.amenities && data.amenities.length > 0) {
      structuredData.amenityFeature = data.amenities.map(amenity => ({
        "@type": "LocationFeatureSpecification",
        "name": amenity,
        "value": true
      }));
    }

    return structuredData;
  }

  /**
   * 生成面包屑导航数据
   */
  static generateBreadcrumbs(items: Array<{name: string, url?: string}>) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url || ""
      }))
    };
  }

  /**
   * 生成FAQ结构化数据
   */
  static generateFAQData(faqs: Array<{question: string, answer: string}>) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }

  /**
   * 生成本地商家结构化数据
   */
  static generateLocalBusinessData(data: {
    name: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    website?: string;
    openingHours?: string;
    priceRange?: string;
  }) {
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": data.name,
      "description": data.description,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": data.address
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": data.latitude,
        "longitude": data.longitude
      },
      "telephone": data.phone,
      "url": data.website,
      "openingHours": data.openingHours,
      "priceRange": data.priceRange
    };
  }

  /**
   * 生成SEO友好的URL参数
   */
  static generateSeoParams(params: Record<string, any>): Record<string, string> {
    const seoParams: Record<string, string> = {};
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        // 将中文转换为拼音或英文
        const value = this.convertToSeoFriendly(params[key].toString());
        seoParams[key] = value;
      }
    });
    
    return seoParams;
  }

  /**
   * 转换为SEO友好的字符串
   */
  static convertToSeoFriendly(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符替换为单个
      .trim();
  }

  /**
   * 生成关键词标签
   */
  static generateKeywords(baseKeywords: string[], additionalKeywords: string[] = []): string {
    const allKeywords = [...baseKeywords, ...additionalKeywords];
    return allKeywords.join(', ');
  }

  /**
   * 设置页面元数据
   */
  static setPageMeta(title: string, description: string, keywords: string) {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: title
    });

    // 设置分享信息
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  }
}

/**
 * 预定义的SEO关键词
 */
export const SEO_KEYWORDS = {
  BASE: [
    '户外露营', '房车营地', '自驾攻略', '免费露营地', '床车露营',
    '野营', '帐篷露营', '户外装备', '露营用品', '自驾游',
    '房车旅游', '露营基地', '营地设施', '户外运动', '旅游攻略'
  ],
  LOCATION: [
    '营地位置', '营地导航', '营地查询', '营地推荐', '营地评价',
    '营地服务', '营地管理', '营地运营', '营地经营'
  ],
  EQUIPMENT: [
    '露营装备', '户外用品', '帐篷', '睡袋', '露营灯',
    '户外炊具', '露营桌椅', '户外服装', '登山鞋'
  ],
  ACTIVITIES: [
    '自驾游', '房车旅游', '床车旅游', '户外运动', '野餐',
    '烧烤', '钓鱼', '徒步', '登山', '摄影'
  ]
};

/**
 * 生成完整的SEO关键词
 */
export function generateFullKeywords(customKeywords: string[] = []): string {
  const allKeywords = [
    ...SEO_KEYWORDS.BASE,
    ...SEO_KEYWORDS.LOCATION,
    ...SEO_KEYWORDS.EQUIPMENT,
    ...SEO_KEYWORDS.ACTIVITIES,
    ...customKeywords
  ];
  
  return [...new Set(allKeywords)].join(', ');
}
