// 存储canvas的id和对应图片路径，图片路径请根据你的项目实际修改
const canvasIds = ["layer1", "layer2", "layer3"];
const imagePaths = ["img/layer1.png", "img/layer2.png", "img/layer3.png"];

// 通过id获取canvas元素和对应的绘图上下文
const canvases = canvasIds.map(id => document.getElementById(id));
const contexts = canvases.map(c => c.getContext("2d"));

// 页面中的光圈元素、画笔大小滑块、显示画笔大小的文本和控制面板
const cursorRing = document.getElementById("cursor-ring");
const brushSizeSlider = document.getElementById("brushSize");
const brushValueText = document.getElementById("brushValue");
const controlPanel = document.getElementById("control-panel");

// 当前正在刮的图层索引，初始为最上层（layer1）
let currentLayer = 0;

// 初始画笔半径，取自滑块默认值
let brushRadius = parseInt(brushSizeSlider.value, 10);

// 是否正在绘制（鼠标按下拖动状态）
let isDrawing = false;

// 记录上一个鼠标位置，用于绘制线条连接点
let lastPos = null;

/**
 * 加载所有图层图片，加载完成后回调callback
 */
function loadImages(callback) {
  let loaded = 0; // 计数已加载图片数量
  for(let i=0; i<imagePaths.length; i++) {
    const img = new Image();
    img.onload = () => {
      // 清空对应canvas再绘制图片，保证每次重置后重新绘制
      contexts[i].clearRect(0, 0, canvases[i].width, canvases[i].height);
      contexts[i].drawImage(img, 0, 0, canvases[i].width, canvases[i].height);
      loaded++;
      if(loaded === imagePaths.length) callback();
    };
    img.src = imagePaths[i];
  }
}

/**
 * 根据当前窗口大小调整所有canvas宽高，使其全屏自适应
 */
function resizeCanvases() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvases.forEach(canvas => {
    canvas.width = width;
    canvas.height = height;
  });
  // 重绘图片
  loadImages(() => {
    // 更新页面显示的画笔大小文字和光圈大小
    brushValueText.textContent = brushRadius;
    updateCursorRingSize();
  });
}

/**
 * 根据鼠标在视口的x,y计算相对canvas坐标
 * @param {HTMLCanvasElement} canvas - 当前操作的canvas
 * @param {number} xRef - 鼠标clientX
 * @param {number} yRef - 鼠标clientY
 * @returns {Object} x和y为canvas坐标
 */
function getBrushPos(canvas, xRef, yRef) {
  const rect = canvas.getBoundingClientRect(); // canvas在视口的位置和大小
  return {
    x: Math.floor(((xRef - rect.left) / rect.width) * canvas.width),
    y: Math.floor(((yRef - rect.top) / rect.height) * canvas.height)
  };
}

/**
 * 在canvas上下文ctx中画一个圆点，模拟笔刷擦除
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 圆心x坐标
 * @param {number} y 圆心y坐标
 */
function drawDot(ctx, x, y) {
  ctx.globalCompositeOperation = "destination-out"; // 擦除模式
  ctx.beginPath();
  ctx.arc(x, y, brushRadius, 0, 2 * Math.PI, true);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over"; // 恢复正常绘制
}

/**
 * 在ctx上下文中，画一条连接start到end的线，模拟鼠标快速移动时的连续刮擦
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} start {x, y}起点坐标
 * @param {Object} end {x, y}终点坐标
 */
function drawLine(ctx, start, end) {
  ctx.globalCompositeOperation = "destination-out"; // 擦除模式
  ctx.lineWidth = brushRadius * 2;
  ctx.lineCap = "round"; // 线帽圆滑
  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over"; // 恢复正常绘制
}

/**
 * 判断当前canvas层是否已经刮掉99%以上透明
 * 通过遍历图像数据透明度通道实现
 * @param {HTMLCanvasElement} canvas 
 * @returns {boolean} true表示已刮完
 */
function isLayerCleared(canvas) {
  const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;
  for(let i=3; i<pixels.length; i+=4) { // 只看alpha通道
    if(pixels[i] === 0) cleared++;
  }
  const percent = cleared / (pixels.length / 4);
  return percent > 0.99; // 超过99%透明即认为刮完
}

/**
 * 当当前层刮完，隐藏当前canvas，切换到下一层
 */
function switchLayer() {
  if(currentLayer < canvases.length - 1 && isLayerCleared(canvases[currentLayer])) {
    canvases[currentLayer].style.display = "none";
    currentLayer++;
  }
}

/**
 * 给所有canvas绑定鼠标事件（按下、移动、离开），只对当前层有效
 * 支持连续线条刮除和光圈显示
 */
function setupCanvasEvents() {
  canvases.forEach((canvas, i) => {
    canvas.addEventListener("mousedown", e => {
      if(i !== currentLayer) return; // 只允许操作当前层
      isDrawing = true;
      lastPos = getBrushPos(canvas, e.clientX, e.clientY);
      drawDot(contexts[i], lastPos.x, lastPos.y);
    });
    canvas.addEventListener("mousemove", e => {
      // 光圈跟随鼠标
      cursorRing.style.left = e.clientX + "px";
      cursorRing.style.top = e.clientY + "px";
      cursorRing.style.display = "block";

      if(!isDrawing || i !== currentLayer) return;

      const pos = getBrushPos(canvas, e.clientX, e.clientY);
      drawLine(contexts[i], lastPos, pos);
      lastPos = pos;
      switchLayer();
    });
    canvas.addEventListener("mouseleave", e => {
      // 鼠标离开画布时隐藏光圈
      cursorRing.style.display = "none";
    });
  });

  // 鼠标放开时停止绘制（作用于整个页面，避免失去焦点bug）
  document.addEventListener("mouseup", () => {
    isDrawing = false;
    lastPos = null;
  });
}

/**
 * 根据当前画笔半径，调整光圈大小，确保光圈大小与画笔匹配
 */
function updateCursorRingSize() {
  const size = brushRadius * 2;
  cursorRing.style.width = size + "px";
  cursorRing.style.height = size + "px";
}

/**
 * 重置所有canvas，显示所有图层，重新加载图片
 */
function resetAll() {
  contexts.forEach(ctx => ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height));
  canvases.forEach(c => c.style.display = "block");
  currentLayer = 0;
  loadImages(() => {});
}

/**
 * 控制面板自动隐藏与显示
 * 当鼠标移入控制面板时，面板弹出（visible类）
 * 当鼠标移出控制面板时，面板隐藏（移出边框外）
 */
function setupControlPanelAutoHide() {
  controlPanel.addEventListener("mouseenter", () => {
    controlPanel.classList.add("visible"); // 弹出显示
  });

  controlPanel.addEventListener("mouseleave", () => {
    controlPanel.classList.remove("visible"); // 隐藏
  });

  // 同时，当鼠标在hero区域（即canvas覆盖区）时，自动隐藏控制面板
  const hero = document.getElementById("hero");
  hero.addEventListener("mouseenter", () => {
    controlPanel.classList.remove("visible");
  });
  hero.addEventListener("mouseleave", () => {
    // 鼠标离开hero时，控制面板仍隐藏，除非鼠标移到控制面板区域
    controlPanel.classList.remove("visible");
  });
}

/**
 * 页面初始化函数
 * 设置窗口尺寸自适应，绑定事件，加载图片
 */
function init() {
  // 页面加载时调整canvas尺寸，适应全屏
  resizeCanvases();

  // 绑定窗口resize事件，调整canvas大小
  window.addEventListener("resize", resizeCanvases);

  // 加载图片，加载完成后绑定canvas事件
  loadImages(() => {
    setupCanvasEvents();
    updateCursorRingSize();
    brushValueText.textContent = brushRadius;
  });

  // 绑定画笔大小滑块事件
  brushSizeSlider.addEventListener("input", function() {
    brushRadius = parseInt(this.value, 10);
    brushValueText.textContent = brushRadius;
    updateCursorRingSize();
  });

  // 绑定重置按钮事件
  document.getElementById("resetBtn").addEventListener("click", resetAll);

  // 绑定控制面板自动显示隐藏
  setupControlPanelAutoHide();
}

// 调用初始化函数，启动程序
init();

