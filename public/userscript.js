// ==UserScript==
// @name         Add 'BulletScreen' to any video element
// @name:zh-CN   为任意视频播放器添加弹幕功能
// @description         Add 'BulletScreen' to any video element
// @description:zh-CN   一切皆可弹幕 - 为任意视频播放器添加本地弹幕支持
// @version      0.0.1
// @author       Kaixinguo
// @match        <all_urls>
// @include      *
// @grant        none
// ==/UserScript==

// You can use Chrome to translate the comments in this scripts.

// 脚本假设:
//  1. 网页内只有一个video元素
//  2. 目标video元素有一个与其大小相同的父容器

// 弹幕格式:
//  仅支持从哔哩哔哩导出的XML格式的本地弹幕

// 目前存在的问题:
//  1. 无任何屏蔽/缩放/定位等弹幕管理功能, "放养"式弹幕

// 弹幕源, 用于存储所有弹幕
class BulletSource {

    bullets = [];
    currentIndex = 0;
    currentTime = 0;

    constructor(bullets) {
        if (!(bullets instanceof Array)) {
            throw "Input arg is not an Array";
        }
        this.bullets = bullets;
    }

    next(time) {
        this.seek(time);
        this.currentTime = time;
        if (this.currentIndex >= this.bullets.length) {
            return null;
        }
        const nextBullet = this.bullets[this.currentIndex];
        if (time < nextBullet.time) {
            return null;
        }
        console.log(`[BulletSource] t=${time} 发送弹幕: [${this.currentIndex}] ${nextBullet.text}`)
        this.currentIndex++;
        return nextBullet;
    }

    // 定位
    seek(time) {

        // 两次请求时间间隔指定秒数内 -> 无跳转
        if (time - 0.5 < this.currentTime && this.currentTime <= time) {
            return;
        }

        let d = Math.abs(this.currentTime - time);
        console.log(`[BulletSource] t=${time} cur=${this.currentTime} now=${time} d=${d} 超过时间间隔阈值, 重新定位...`);

        // 查找算法选择
        if (d > 10) {
            // 超出指定秒数 -> 折半查找
            this.binarySearch(time);
        } else {
            // 否则 -> 顺序查找
            this.sequentialSearch(time);
        }
    }

    // 顺序查找
    sequentialSearch(time) {
        const oldIndex = this.currentIndex;

        let direction = 0;
        if (time < this.currentTime) {
            direction = -1;
        } else if (time > this.currentTime) {
            direction = 1;
        } else {
            return;
        }

        let cur = (oldIndex !== 0) ? oldIndex : ((this.bullets.length >= 1) ? 1 : 0);
        let seekCount = 0;
        while ((cur - 1) >= 0 && cur < this.bullets.length) {
            console.log(cur)
            if (this.bullets[cur - 1].time <= time && time < this.bullets[cur].time) {
                break;
            } else {
                cur = cur + direction;
            }
            seekCount++;
        }

        this.currentIndex = cur;
        this.currentTime = time;
        console.log(`[BulletSource] t=${time} 已重定位, 顺序查找次数${seekCount} [${oldIndex}] --> [${this.currentIndex}]`)
    }

    // 折半查找
    binarySearch(time) {
        const oldIndex = this.currentIndex;

        let low = 0, high = this.bullets.length - 1;
        if (this.bullets[oldIndex].time < time) {
            low = oldIndex;
        } else if (time < this.bullets[oldIndex].time) {
            high = oldIndex;
        } else {
            this.currentIndex = oldIndex;
            this.currentTime = time;
            return;
        }
        let mid = Math.floor((low + high) / 2);

        let seekCount = 0;
        while ((mid - 1) >= 0 && mid < this.bullets.length) {
            console.log(mid)
            if (time < this.bullets[mid - 1].time) {
                high = mid;
                mid = Math.floor((low + high) / 2);
            } else if (this.bullets[mid].time < time) {
                low = mid;
                mid = Math.floor((low + high) / 2);
            } else {
                break;
            }
            seekCount++;
            if (seekCount > 50) break // 最大折半查找次数, (2^50 = 1125899906842624)
        }

        this.currentIndex = mid;
        this.currentTime = time;
        console.log(`[BulletSource] t=${time} 已重定位, 折半查找次数${seekCount} [${oldIndex}] --> [${this.currentIndex}]`)
    }
}

// 弹幕数据, 用于存储单条弹幕的内容与元数据
// 每条即为一条从XML文件中读取的弹幕
class Bullet {
    constructor(text, attributes) {
        const meta = attributes.split(",");
        this.text = text; // 弹幕内容
        this.time = Number(meta[0]); // 弹幕在视频里的时间
        this.type = Number(meta[1]); // 弹幕类型 (1;4;5;6;[7];[9])
        this.size = Number(meta[2]); // 字体大小
        this.color = '#' + Number(meta[3]).toString(16); // 十进制的RGB颜色 (16进制转10进制)
        this.timestamp = Number(meta[4]); // 弹幕发送时间戳 (unix时间戳)
        this.pool = meta[5]; // 弹幕池
        this.uid_crc32 = meta[6]; // 发送者uid的crc32
        this.row_id = meta[7]; // 标记顺序和历史弹幕
    }
}

// 弹幕实例, 用于实际绘制操作
// 每条即为一条正在屏幕上渲染的弹幕实例
class BulletInstance {

    static default = {
        speed: 2,
        range: [0, 1],
        opacity: 100,
    };

    bullet = null;
    options = {};

    constructor(bullet, canvas, options) {
        this.bullet = bullet;
        this.options = options || {};

        // 速度
        this.speed = (this.options.speed || BulletInstance.default.speed) + bullet.text.length / 100;

        // 字号大小
        this.fontSize = bullet.size;

        // 文字颜色
        this.color = bullet.color;

        // range范围
        this.range = this.options.range || BulletInstance.default.range;

        // 透明度
        this.opacity = (this.options.opacity || BulletInstance.default.opacity) / 100;

        // 内容长度
        const span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.whiteSpace = 'nowrap';
        span.style.font = 'bold ' + this.fontSize + 'px "microsoft yahei", sans-serif';
        span.innerText = this.bullet.text;
        span.textContent = this.bullet.text;
        document.body.appendChild(span);
        this.width = span.clientWidth; // 求得文字内容宽度
        document.body.removeChild(span); // 移除dom元素

        // 初始水平位置和垂直位置
        if (bullet.type === 40 || bullet.type === 50) {
            this.x = (this.x - this.width) / 2; // 顶部或底部弹幕
        } else {
            this.x = canvas.width; // 滚动弹幕
        }
        this.y = this.range[0] * canvas.height + (this.range[1] - this.range[0]) * canvas.height * Math.random();
        if (this.y < this.fontSize) {
            this.y = this.fontSize;
        } else if (this.y > canvas.height - this.fontSize) {
            this.y = canvas.height - this.fontSize;
        }
    }

    update() {
        if (!this.disabled) {
            this.x -= this.speed;
            if (this.bullet.type === 40 || this.bullet.type === 50) {
                // 不动的弹幕
                this.actualX -= top.speed;
            } else {
                this.actualX = this.x;
            }
            // 移出屏幕
            if (this.actualX < -1 * this.width) {
                // 下面这行给speed为0的弹幕
                this.x = this.actualX;
                // 该弹幕不运动
                this.disabled = true;
            }
        }
    }

    draw(context) {
        context.shadowColor = 'rgba(0,0,0,' + this.opacity + ')';
        context.shadowBlur = 2;
        context.font = this.fontSize + 'px "microsoft yahei", sans-serif';
        if (/rgb\(/.test(this.color)) {
            context.fillStyle = 'rgba(' + this.color.split('(')[1].split(')')[0] + ',' + this.opacity + ')';
        } else {
            context.fillStyle = this.color;
        }
        // 填色
        context.fillText(this.bullet.text, this.x, this.y);
    }
}

// 封装过的弹幕播放器对象
// 传入目标video元素与弹幕源即可实现弹幕功能
class BulletScreen {

    bulletInstances = [];
    video = null;
    source = null;
    canvas = null;
    context = null;
    time = 0;
    isPause = false;

    constructor(video, source) {
        this.bulletInstances.length = 0;
        this.video = video;
        this.source = source;

        // Create canvas
        this.canvas = document.createElement("canvas");
        this.canvas.style = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            pointer-events: none;
        `;
        video.parentNode.insertBefore(this.canvas, video);

        this.context = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.time = video.currentTime;

        // Listen video events
        video.addEventListener('play', () => this.videoPlayEventHandler());
        video.addEventListener('pause', () => this.videoPauseEventHandler());
        video.addEventListener('seeking', () => this.videoSeekingEventHandler());
        video.addEventListener('seeked', () => this.videoSeekedEventHandler());

        if (video.paused === false) {
            this.videoPlayEventHandler();
        }
    }

    videoPlayEventHandler() {
        console.log("[BulletScreen] 开始播放")
        this.isPause = false;
        this.render();
    }

    videoPauseEventHandler() {
        console.log("[BulletScreen] 暂停播放")
        this.isPause = true;
    }

    videoSeekingEventHandler() {
        console.log("[BulletScreen] 定位中...")
    }

    videoSeekedEventHandler() {
        console.log("[BulletScreen] 定位成功")
        this.time = this.video.currentTime;
    }

    render() {
        // 更新已经播放时间
        this.time = this.video.currentTime;
        // 清除画布
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 新增弹幕
        if (!this.video.seeking) {
            let nextBullet = this.source.next(this.time);
            while (nextBullet) {
                this.bulletInstances.push(new BulletInstance(nextBullet, this.canvas));
                nextBullet = this.source.next(this.time);
            }
        }
        // 更新并绘制弹幕
        this.bulletInstances.forEach(instance => {
            instance.update();
            instance.draw(this.context);
        });
        // 删除弹幕
        this.bulletInstances = this.bulletInstances.filter(i => !i.disabled);
        // 继续渲染
        if (this.isPause === false) {
            requestAnimationFrame(() => this.render());
        }
    }
}

// 从XML文件创建弹幕源
async function getBulletSourceFromFile() {

    function readXmlFile() {
        return new Promise((resolve) => {
            const fileInput = document.createElement('input');

            fileInput.onchange = function () {
                if (!fileInput.value) { alert('没有选择文件'); return; }

                // 获取File引用:
                const file = fileInput.files[0];

                // 获取File信息:
                if (file.type !== 'text/xml') { alert('不是有效的XML文件!'); return; }

                // 读取文件:
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                // 以DataURL的形式读取文件:
                reader.readAsText(file);
            };

            fileInput.setAttribute('id','_ef');
            fileInput.setAttribute('type','file');
            fileInput.setAttribute("style",'visibility:hidden');
            //document.body.appendChild(fileInput);

            fileInput.click();
        });
    }

    function xmlToJson(xml) {
        // Create the return object
        let obj = {};
        if (xml.nodeType === 1) { // element
            // do attributes
            if (xml.attributes.length > 0) {
                obj["@attributes"] = {};
                for (let j = 0; j < xml.attributes.length; j++) {
                    const attribute = xml.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (xml.nodeType === 3) { // text
            obj = xml.nodeValue;
        }
        // do children
        if (xml.hasChildNodes()) {
            for(let i = 0; i < xml.childNodes.length; i++) {
                const item = xml.childNodes.item(i);
                const nodeName = item.nodeName;
                if (obj[nodeName] === undefined) {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (!(obj[nodeName] instanceof Array)) {
                        const old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
        return obj;
    }

    const data = await readXmlFile();
    const xmlDoc = await new DOMParser().parseFromString(data, "text/xml");
    const json = xmlToJson(xmlDoc);
    const raws = json.i.d;

    return new BulletSource(
        raws
            .filter(raw => raw !== null)
            .map(raw => new Bullet(raw["#text"], raw["@attributes"].p))
            .sort((a, b) => a.time - b.time)
    );
}

async function initBulletScreen(video) {
    const source = await getBulletSourceFromFile();
    new BulletScreen(video, source);
}

function selectTargetVideo() {
    const videos = [];
    document.querySelectorAll("video").forEach(video => videos.push({
        video: video,
        init: () => { initBulletScreen(video) }
    }))
    if (videos.length === 0) {
        alert("页面中没有video元素, 无法启用弹幕功能");
    } else if (videos.length === 1) {
        console.log("[Init] 页面中有一个video元素, 支持此页面");
        videos[0].init();
    } else {
        alert("页面中有一个以上video元素, 暂时不想支持此类页面");
    }
}

function initUI() {
    const button = document.createElement("button");
    button.innerText = "弹"
    button.style = `
        position: fixed;
        top: 10px;
        left: 10px;
        width: 30px;
        height: 30px;
        z-index: 10000000000000;
        text-align: center;
        font: 400 13.3333px Arial;
        border-style: none;
        border-radius: 5px;
        color: #ffffff;
        background-color: #00a1d6;
        cursor: pointer;
    `;
    button.hidden = true;
    button.onblur = () => {
        button.hidden = true;
    };
    button.onclick = () => {
        selectTargetVideo();
        button.hidden = true;
    };
    document.body.parentElement.insertBefore(button, document.body);
    document.body.parentElement.onkeydown = (e) => {
        if (e.code === 'ControlLeft') {
            button.hidden = false;
        }
    }
    document.body.parentElement.onkeyup = (e) => {
        if (e.code === 'ControlLeft') {
            button.hidden = true;
        }
    }
    console.log("[BulletScreen] Init UI")
}

initUI()

