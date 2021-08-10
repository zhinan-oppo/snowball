执楠内部使用的 JavaScript 库，包含：

## 开发

### watch

其中 `@zhinan-oppo/image-loader` 仅作为 package name 的示例：

```bash
yarn workspace @zhinan-oppo/image-loader watch
```

### build

```bash
yarn workspace @zhinan-oppo/image-loader build
```

## 添加依赖

```bash
yarn workspace @zhinan-oppo/image-loader add [-D] xxxx
```

## 发布

需要先把修改提交。

```bash
lerna publish

# 或
yarn release
```

如果由于某些原因导致 version 成功更新，但是发布失败，尝试：

```bash
lerna publish from-package
```
