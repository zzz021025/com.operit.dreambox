# 来信 · 天使集（Dreambox）

Operit 沙箱包（sandbox package），**WIP v0.1.0**。

拟态玻璃来信空间：梦核 / 天使集 / Never Forget 三块面板纵向堆叠，记录梦、家机动听的时刻、不想忘的事。冬色主色卡，背景与头像可换，数据本地持久化。

## 仓库状态

> 目前是半成品，按原样上传存档。接口未定稿，别直接当发布版用。

## 目录

```
manifest.json          包清单（com.operit.dreambox / 0.1.0）
main.js                UI 路由注册（keepAlive=true）
ui/index.ui.js         侧边栏 UI（Compose DSL）
packages/dreambox_tools.js   子包 dreambox_tools（机 侧读写工具）
```

## 数据

- `store.json`（标准对象 JSON，本地持久化）
- 至少包含：palette、name、letters[]、todayMsg、todayDate、curType、settings
- letters 项：id、type、content、ts、comments、aiReply

## 安装（dev）

用 operit_editor:debug_install_toolpkg，source_path 指向本目录，activate_subpackages=dreambox_tools。
