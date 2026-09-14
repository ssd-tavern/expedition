# 富兰克林远征｜全屏前端

## 版权与许可（请先读）

本仓库全部内容，包括但不限于脚本代码、样式、界面结构、交互流程、视觉风格、素材图、文案、数据表与实现思路，均为作者 ssd（类脑 @buyssdcom）独立原创，保留一切权利。本仓库不采用任何开源许可证，公开托管仅为角色卡分发之需，不构成任何授权。

未经作者书面许可，禁止任何个人或组织进行以下行为：

- 复制、转载、搬运、镜像、再分发本仓库任何文件或其片段，无论是否注明出处
- 修改、改编、二次创作、翻译、移植到其他角色卡、脚本、平台或项目
- 参考、借鉴、模仿、致敬本前端的界面布局、交互流程、视觉风格、玩法结构、数据结构或实现思路，用于制作任何其他作品
- 反编译、反混淆、逆向分析，或将本仓库任何内容输入 AI 模型用于学习、生成、改写衍生内容
- 在其他角色卡、脚本或页面中引用本仓库的 CDN 地址加载脚本或素材
- 任何形式的商业用途，包括付费分发、打包售卖、引流变现

唯一允许的使用方式：通过作者本人发布的「富兰克林远征」角色卡正常游玩。

发现侵权将在相关社区公开指认并保留追究权利。

## English

All contents of this repository (code, styles, UI structure, interaction design, visual style, image assets, text, data tables and implementation ideas) are the original work of ssd and are protected under all applicable rights. No open-source license is granted. Copying, redistributing, modifying, adapting, porting, imitating, reverse engineering, de-obfuscating, feeding into AI models for derivative generation, hot-linking the CDN URLs from other projects, and any commercial use are all prohibited without the author's written permission. The only permitted use is playing the "富兰克林远征" character card released by the author.

## 内容说明

- `dist/expedition-shell.js`：全屏外壳脚本本体，由角色卡内嵌的 loader 通过精确锚定 tag 的 jsDelivr URL 动态加载
- 版本以 git tag 管理（`v4.x.x`），tag 一经推送即被 jsDelivr 永久缓存，不可移动或复用，任何改动都必须打新 tag
- 依赖：酒馆助手（JS-Slash-Runner）、MVU 变量框架、提示词模板插件，随角色卡一同配置

本仓库只存放构建产物，开发与测试在别处进行；直接修改本仓库的文件不会进入发布流程。
