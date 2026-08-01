# 富兰克林远征 · 全屏前端

SillyTavern 角色卡「富兰克林远征」的全屏前端脚本，经 jsDelivr CDN 分发。

- `dist/expedition-shell.js`：全屏外壳脚本本体，由角色卡内嵌的 loader 通过
  `https://testingcf.jsdelivr.net/gh/ssd-tavern/expedition@3/dist/expedition-shell.js` 动态加载
- 版本以 git tag 管理（`v3.x.x`），loader 锚定大版本区间 `@3`，同一大版本内的修复自动生效
- 依赖：酒馆助手（JS-Slash-Runner）、MVU 变量框架、提示词模板插件，随角色卡一同配置

本仓库只存放构建产物，开发与测试在别处进行；直接修改本仓库的文件不会进入发布流程。
