class BulletSource {

    bullets = [];
    current = 0;

    constructor(bullets) {
        if (!(bullets instanceof Array)) {
            throw "Input arg is not an Array";
        }
        this.bullets = bullets;
    }

    seek(time) {
        this.current = 0;
        while (this.bullets[this.current].time < time) {
            this.current++;
        }
    }

    next(time) {
        if (this.current >= this.bullets.length) {
            return null;
        }
        const nextBullet = this.bullets[this.current];
        if (time < nextBullet.time) {
            return null;
        }
        this.current++;
        return nextBullet;
    }
}

class Bullet {
    constructor(text, attributes) {
        const meta = attributes.split(",");
        this.text = text; // 弹幕内容
        this.time = Number(meta[0]); // 弹幕在视频里的时间
        this.type = Number(meta[1]); // 弹幕类型 (1;4;5;6;[7];[9])
        this.size = Number(meta[2]); // 字体大小
        this.color = meta[3]; // 十进制的RGB颜色 (16进制转10进制)
        this.timestamp = Number(meta[4]); // 弹幕发送时间戳 (unix时间戳)
        this.pool = meta[5]; // 弹幕池
        this.uid_crc32 = meta[6]; // 发送者uid的crc32
        this.row_id = meta[7]; // 标记顺序和历史弹幕
    }
}

class BulletInstance {

    static default = {
        speed: 2,
        range: 10,
        opacity: 1,
    };

    bullet = new Bullet();
    options = {};

    constructor(bullet, canvas, options) {
        this.bullet = bullet;
        this.options = options;

        // 速度
        this.speed = (options.speed || Bullet.default.speed) + bullet.text.length / 100;

        // 字号大小
        this.fontSize = bullet.size;

        // 文字颜色
        this.color = bullet.color;

        // range范围
        this.range = options.range || Bullet.default.range;

        // 透明度
        this.opacity = (options.opacity || Bullet.default.opacity) / 100;

        // 内容长度
        const span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.whiteSpace = 'nowrap';
        span.style.font = 'bold ' + this.fontSize + 'px "microsoft yahei", sans-serif';
        span.innerText = this.text;
        span.textContent = this.text;
        document.body.appendChild(span);
        this.width = span.clientWidth; // 求得文字内容宽度
        document.body.removeChild(span); // 移除dom元素

        // 初始水平位置和垂直位置
        if (bullet.type === 4 || bullet.type === 5) {
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

    update(time, context) {
        if (!this.disabled && this.time <= time) {
            this.x -= this.speed;
            if (this.bullet.type === 4 || this.bullet.type === 5) {
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
            // 根据新位置绘制圆圈圈
            this.draw(context);
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

    video = null;

    constructor(video) {
        this.video = video;
    }
}

new Bullet(raw["#text"], raw["@attributes"].p)
