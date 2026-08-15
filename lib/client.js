window.__ModuleLoader__.load({ id: "bottom-info-bar", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-chatgpt-subscription — client half（占位骨架，设置页「订阅」待补）
module.exports = {
  inject: ['slots'],
  async apply(ctx) {
    // 设置页「订阅」UI 将在下一步实现（settings.section 注册 + 绑定/解绑/额度展示）
    return function () {};
  },
};

return module.exports;
} });
