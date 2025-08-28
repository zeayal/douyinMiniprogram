// pages/feedback/feedback.ts
import { request } from "../../utils/http";
import { BASE_URL } from "../../constants/common";

Page({
  /**
   * 页面的初始数据
   */
  data: {
    feedbackType: "", // 反馈类型: bug, suggestion, other
    content: "", // 反馈内容
    contact: "", // 联系方式
    pics: [] as string[], // 图片列表
  },

  // 选择反馈类型
  selectType(e: any) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      feedbackType: type,
    });
  },

 
  // 选择图片
  chooseImage() {
    tt.chooseMedia({
      count: 9 - this.data.pics.length,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const file = res.tempFiles[0];
        tt.uploadFile({
          url: BASE_URL + '/api/fs-service/uploadFileToOSS',
          filePath: file.tempFilePath,
          name: 'files',
          header: {
            enctype: "multipart/form-data"
          },
          success: (res) => {
            const data = res.data
            const jsonData = JSON.parse(data);
            if (jsonData.code === 0) {
              tt.showToast({ title: jsonData.msg, icon: 'success' })
              const newPic = { previewUrl: file.tempFilePath, serverFilename: jsonData.data.filename }
              const pics = this.data.pics.concat([newPic]);
              this.setData({
                "pics": pics,
              });
            } else {
              tt.showToast({ title: jsonData.msg, icon: 'error' })
            }
          }
        })

      },
    });
  },

  // 删除图片
  deleteImage(e: any) {
    const index = e.currentTarget.dataset.index;
    const pics = this.data.pics;
    pics.splice(index, 1);
    this.setData({
      "pics": pics,
    });
  },

 
  // 提交反馈
  submitFeedback() {
    const { feedbackType, content } = this.data;

    // 表单验证
    if (!feedbackType) {
      tt.showToast({
        title: "请选择反馈类型",
        icon: "none",
      });
      return;
    }

    if (!content.trim()) {
      tt.showToast({
        title: "请填写反馈内容",
        icon: "none",
      });
      return;
    }

    // 显示上传中提示
    tt.showLoading({
      title: "提交中...",
      mask: true,
    });

    this.sendFeedback();
  },

  // 发送反馈内容到服务器
  async sendFeedback() {
    try {
      const { feedbackType, content, contact } = this.data;

      // 调用反馈接口
      const res = await request({
        url: "/api/feedbacks/add",
        method: "POST",
        data: {
          content,
          type: feedbackType.toUpperCase(),
          mobile: contact || "未提供",
          pics: this.data.pics?.map(pic => pic.serverFilename)
        },
      });

      tt.hideLoading();

      // 根据接口返回处理结果
      if (res.code === 0) {
        tt.showToast({
          title: "感谢您的反馈！",
          icon: "success",
          duration: 2000,
        });

        // 成功后清空表单
        setTimeout(() => {
          tt.navigateBack();
        }, 3000);
      } else {
        tt.showToast({
          title: res.msg || "提交失败，请重试",
          icon: "none",
        });
      }
    } catch (error) {
      tt.hideLoading();
      tt.showToast({
        title: "网络错误，请稍后再试",
        icon: "none",
      });
      console.error("反馈提交失败", error);
    }
  },
});
