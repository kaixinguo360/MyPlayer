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
        if (!(time - 10 < this.currentTime && this.currentTime <= time)) {
            console.log(`[BulletSource] t=${time} cur=${this.currentTime} now=${time} 超过时间间隔阈值, 重新定位...`)
            this.seek(time);
        }
        this.currentTime = time;
        if (this.currentTime > time || (time - this.currentTime) < 10) { //TODO: Magic Number: 10
        }
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

    seek(time) {
        const oldIndex = this.currentIndex;
        if (time < this.currentTime) {
            this.currentIndex = 0;
        }
        let tmpCount = 0;
        while (this.bullets[this.currentIndex].time < time && this.currentIndex < this.bullets.length) {
            this.currentIndex++;
            tmpCount++;
        }
        this.currentTime = time;
        console.log(`[BulletSource] t=${time} 已重定位, 指针移动次数${tmpCount} [${oldIndex}] --> [${this.currentIndex}]`)
    }
}

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

class Screen {

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
        this.canvas.style.position = 'absolute'
        this.canvas.style.top = '0'
        this.canvas.style.left = '0'
        this.canvas.style.width = '100%'
        this.canvas.style.height = '100%'
        this.canvas.style['z-index'] = '1'
        this.canvas.style['pointer-events'] = 'none';
        video.parentNode.insertBefore(this.canvas, video);

        this.context = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.time = video.currentTime;

        // 视频处理
        video.addEventListener('play', () => this.videoPlayEventHandler());
        video.addEventListener('pause', () => this.videoPauseEventHandler());
        video.addEventListener('seeking', () => this.videoSeekingEventHandler());
        video.addEventListener('seeked', () => this.videoSeekedEventHandler());
    }

    videoPlayEventHandler() {
        console.log("[Screen] 开始播放")
        this.isPause = false;
        this.render();
    }

    videoPauseEventHandler() {
        console.log("[Screen] 暂停播放")
        this.isPause = true;
    }

    videoSeekingEventHandler() {
        console.log("[Screen] 定位中...")
    }

    videoSeekedEventHandler() {
        console.log("[Screen] 定位成功")
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
                if (typeof(obj[nodeName]) == "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof(obj[nodeName].length) == "undefined") {
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

async function init(video) {
    const source = await getBulletSourceFromFile();
    new Screen(video, source);
}

function attachButton(video) {

    const button = document.createElement("button");
    button.style.position = 'absolute'
    button.style.top = '10px'
    button.style.left = '10px'
    button.style.width = '30px'
    button.style.height = '30px'
    button.style['z-index'] = '100'
    video.parentNode.insertBefore(button, video);

    return button;
}

window.onload = function () {
    const videos = [];
    document.querySelectorAll("video").forEach(video => videos.push({
        video: video,
        init: () => { init(video) }
    }))
    if (videos.length === 1) {
        const button = attachButton(document.body)
        button.onclick = videos[0].init;
    }
}

