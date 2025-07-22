## 刮刮乐

> 一个简简单单的前端刮刮乐

写这个项目一个是灵机一动,一个是学习一下前端,为后续写GUI打基础

起因是看到很多blog都有使用封面是一个图片然后下滑进入文章部分的主题,如 Butterfly、Fluid、Shoka 等的结构

然后觉得单图片没啥意思希望添加点互动,让图片更有意思一些,于是浅浅做了这些

文件有详细的注释,打开即食

目前是三层图片,更改更多的话只需要 `index.html` 里在  `<canvas id="layer3"></canvas>` 部分增加一行然后在 `script.js` 的开头(如下部分)也添加上即可,

```js
const canvasIds = ["layer1", "layer2", "layer3"];
const imagePaths = ["img/layer1.png", "img/layer2.png", "img/layer3.png"];
```


欢迎二开,我好像也能把这个做成一个hexo主题,但是懒得搞了,随缘更新吧

PS:0基础的同学不妨直接把代码喂给gpt,我想他还是能扩充一些功能的
