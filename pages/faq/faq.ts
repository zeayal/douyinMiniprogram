// pages/faq/faq.ts
import { SEOUtils, generateFullKeywords } from '../../utils/seo';

Page({
  data: {
    faqList: [
      {
        id: 1,
        question: "什么是免费露营地？",
        answer: "免费露营地是指不收取营地费用的户外露营场所，通常位于公园、自然保护区或公共土地上，为户外爱好者提供免费的露营体验。这些营地通常提供基本的露营设施，如平整的地面、厕所、水源等。",
        expanded: false
      },
      {
        id: 2,
        question: "如何选择合适的露营地？",
        answer: "选择露营地时需要考虑地理位置、设施条件、安全因素、环境质量等因素。建议查看营地的详细信息和用户评价，选择符合自己需求的营地。同时要注意营地的开放时间、预订要求、费用情况等。",
        expanded: false
      },
      {
        id: 3,
        question: "房车露营需要什么装备？",
        answer: "房车露营需要房车、电源设备、水箱、厨具、床上用品等基本装备。同时建议携带导航设备、急救包、工具包等应急物品。还需要准备户外服装、防晒用品、防蚊虫用品等。",
        expanded: false
      },
      {
        id: 4,
        question: "帐篷露营的注意事项有哪些？",
        answer: "帐篷露营需要注意天气情况、地形选择、帐篷搭建技巧、防潮防虫、安全用火等。建议选择平整、干燥、避风的地方搭建帐篷。同时要注意帐篷的防水性能、通风性、保暖性等。",
        expanded: false
      },
      {
        id: 5,
        question: "如何保证露营安全？",
        answer: "露营安全包括人身安全、财产安全、环境安全。建议结伴而行、携带应急设备、遵守营地规定、保护环境、注意用火安全。同时要注意天气变化、野生动物、地形危险等。",
        expanded: false
      },
      {
        id: 6,
        question: "床车露营和房车露营有什么区别？",
        answer: "床车露营是将普通车辆改装成可睡觉的露营车，空间相对较小，适合短途旅行。房车露营使用专门的房车，空间更大，设施更完善，适合长途旅行。两者各有优势，可根据需求选择。",
        expanded: false
      },
      {
        id: 7,
        question: "户外装备如何选择？",
        answer: "户外装备选择要根据活动类型、季节、地形等因素综合考虑。基本装备包括帐篷、睡袋、防潮垫、背包、户外服装、鞋子等。建议选择知名品牌，确保质量和安全性。",
        expanded: false
      },
      {
        id: 8,
        question: "露营地的设施通常包括什么？",
        answer: "露营地设施通常包括厕所、水源、电源、停车场、垃圾箱等基本设施。部分营地还提供淋浴、洗衣房、餐厅、商店等便利设施。设施完善程度因营地而异。",
        expanded: false
      }
    ]
  },

  onLoad() {
    // 设置SEO元数据
    this.setSeoMeta();
  },

  /**
   * 设置SEO元数据
   */
  setSeoMeta() {
    const title = SEOUtils.generateTitle('常见问题', ['FAQ', '问答']);
    const description = '户外露营、房车营地、自驾攻略常见问题解答，包含免费露营地、床车露营、帐篷露营、户外装备等相关问题。';
    const keywords = generateFullKeywords(['FAQ', '常见问题', '问答', '帮助']);
    
    SEOUtils.setPageMeta(title, description, keywords);
  },

  /**
   * 切换FAQ展开状态
   */
  toggleFaq(e: any) {
    const index = e.currentTarget.dataset.index;
    const faqList = this.data.faqList;
    faqList[index].expanded = !faqList[index].expanded;
    
    this.setData({
      faqList: faqList
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '户外露营常见问题解答 - 房车营地、自驾攻略FAQ',
      path: 'pages/faq/faq'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '户外露营常见问题解答 - 房车营地、自驾攻略FAQ'
    };
  }
});
