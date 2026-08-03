# 富兰克林远征｜全屏前端

SillyTavern 角色卡「富兰克林远征」的全屏前端脚本，经 jsDelivr CDN 分发。

- `dist/expedition-shell.js`：全屏外壳脚本本体，由角色卡内嵌的 loader 通过精确锚定 tag 的 jsDelivr URL 动态加载
- 版本以 git tag 管理（`v4.x.x`），tag 一经推送即被 jsDelivr 永久缓存，不可移动或复用，任何改动都必须打新 tag
- 依赖：酒馆助手（JS-Slash-Runner）、MVU 变量框架、提示词模板插件，随角色卡一同配置

本仓库只存放构建产物，开发与测试在别处进行；直接修改本仓库的文件不会进入发布流程。
