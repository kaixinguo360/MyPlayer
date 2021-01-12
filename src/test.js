function CanvasBarrage(canvas, video, options) {
    if (!canvas || !video) {
        return;
    }
    var defaults = {
        opacity: 100,
        fontSize: 24,
        speed: 2,
        range: [0,1],
        color: 'white',
        data: []
    };

    options = options || {};

    var params = {};
    // 参数合并
    for (var key in defaults) {
        if (options[key]) {
            params[key] = options[key];
        } else {
            params[key] = defaults[key];
        }

        this[key] = params[key];
    }
    var top = this;
    var data = top.data;

    if (!data || !data.length) {
        return;
    }

    var context = canvas.getContext('2d');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // 存储实例
    var store = {};

    // 暂停与否
    var isPause = true;
    // 播放时长
    var time = video.currentTime;

    // 字号大小
    // eslint-disable-next-line no-unused-vars
    var fontSize = 28;

    // 实例方法
    var Barrage = function (obj) {
        // 一些变量参数
        this.value = obj.value;
        this.time = obj.time;
        // data中的可以覆盖全局的设置
        this.init = function () {
            // 1. 速度
            var speed = top.speed;
            if (obj.speed !== undefined) {
                speed = obj.speed;
            }
            if (speed !== 0) {
                // 随着字数不同，速度会有微调
                speed = speed + obj.value.length / 100;
            }
            // 2. 字号大小
            var fontSize = obj.fontSize || top.fontSize;

            // 3. 文字颜色
            var color = obj.color || top.color;
            // 转换成rgb颜色
            color = (function () {
                var div = document.createElement('div');
                div.style.backgroundColor = color;
                document.body.appendChild(div);
                var c = window.getComputedStyle(div).backgroundColor;
                document.body.removeChild(div);
                return c;
            })();

            // 4. range范围
            var range = obj.range || top.range;
            // 5. 透明度
            var opacity = obj.opacity || top.opacity;
            opacity = opacity / 100;

            // 计算出内容长度
            var span = document.createElement('span');
            span.style.position = 'absolute';
            span.style.whiteSpace = 'nowrap';
            span.style.font = 'bold ' + fontSize + 'px "microsoft yahei", sans-serif';
            span.innerText = obj.value;
            span.textContent = obj.value;
            document.body.appendChild(span);
            // 求得文字内容宽度
            this.width = span.clientWidth;
            // 移除dom元素
            document.body.removeChild(span);

            // 初始水平位置和垂直位置
            this.x = canvas.width;
            if (speed == 0) {
                this.x	= (this.x - this.width) / 2;
            }
            this.actualX = canvas.width;
            this.y = range[0] * canvas.height + (range[1] - range[0]) * canvas.height * Math.random();
            if (this.y < fontSize) {
                this.y = fontSize;
            } else if (this.y > canvas.height - fontSize) {
                this.y = canvas.height - fontSize;
            }

            this.moveX = speed;
            this.opacity = opacity;
            this.color = color;
            this.range = range;
            this.fontSize = fontSize;
        };

        this.draw = function () {
            // 根据此时x位置绘制文本
            context.shadowColor = 'rgba(0,0,0,'+ this.opacity +')';
            context.shadowBlur = 2;
            context.font = this.fontSize + 'px "microsoft yahei", sans-serif';
            if (/rgb\(/.test(this.color)) {
                context.fillStyle = 'rgba('+ this.color.split('(')[1].split(')')[0] +','+ this.opacity +')';
            } else {
                context.fillStyle = this.color;
            }
            // 填色
            context.fillText(this.value, this.x, this.y);
        };
    };

    data.forEach(function (obj, index) {
        store[index] = new Barrage(obj);
    });

    // 绘制弹幕文本
    var draw = function () {
        for (var index in store) {
            var barrage = store[index];

            if (barrage && !barrage.disabled && time >= barrage.time) {
                if (!barrage.inited) {
                    barrage.init();
                    barrage.inited = true;
                }
                barrage.x -= barrage.moveX;
                if (barrage.moveX == 0) {
                    // 不动的弹幕
                    barrage.actualX -= top.speed;
                } else {
                    barrage.actualX = barrage.x;
                }
                // 移出屏幕
                if (barrage.actualX < -1 * barrage.width) {
                    // 下面这行给speed为0的弹幕
                    barrage.x = barrage.actualX;
                    // 该弹幕不运动
                    barrage.disabled = true;
                }
                // 根据新位置绘制圆圈圈
                barrage.draw();
            }
        }
    };

    // 画布渲染
    var render = function () {
        // 更新已经播放时间
        time = video.currentTime;
        // 清除画布
        context.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制画布
        draw();

        // 继续渲染
        if (isPause == false) {
            requestAnimationFrame(render);
        }
    };

    // 视频处理
    video.addEventListener('play', function () {
        isPause = false;
        render();
    });
    video.addEventListener('pause', function () {
        isPause = true;
    });
    video.addEventListener('seeked', function () {
        // 跳转播放需要清屏
        top.reset();
    });


    // 添加数据的方法
    this.add = function (obj) {
        store[Object.keys(store).length] = new Barrage(obj);
    };

    // 重置
    this.reset = function () {
        time = video.currentTime;
        // 画布清除
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (var index in store) {
            var barrage = store[index];
            if (barrage) {
                // 状态变化
                barrage.disabled = false;
                // 根据时间判断哪些可以走起
                if (time < barrage.time) {
                    // 视频时间小于播放时间
                    // barrage.disabled = true;
                    barrage.inited = null;
                } else {
                    // 视频时间大于播放时间
                    barrage.disabled = true;
                }
            }
        }
    };
}
function readXmlFile() {
    return new Promise((resolve) => {
        var fileInput = document.createElement('input');

        fileInput.onchange = function () {
            if (!fileInput.value) { alert('没有选择文件'); return; }

            // 获取File引用:
            var file = fileInput.files[0];

            // 获取File信息:
            if (file.type !== 'text/xml') { alert('不是有效的XML文件!'); return; }

            // 读取文件:
            var reader = new FileReader();
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
    var obj = {};
    if (xml.nodeType === 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType === 3) { // text
        obj = xml.nodeValue;
    }
    // do children
    if (xml.hasChildNodes()) {
        for(var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof(obj[nodeName]) == "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof(obj[nodeName].length) == "undefined") {
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
}
async function getData() {
    var data = await readXmlFile();
    var xmlDoc = await new DOMParser().parseFromString(data,"text/xml");
    var json = xmlToJson(xmlDoc);
    var raws = json.i.d;

    return raws.filter(raw => raw !== null).map(raw => {
        var value = raw["#text"];
        var meta = raw["@attributes"].p;
        return {
            value,
            time: Number(meta.split(",")[0]),
        };
    }).sort((a, b) => a.time - b.time);
}
async function attachToBody() {
    var video = document.getElementsByClassName("htmlvideoplayer htmlvideoplayer-moveupsubtitles")[0];

    var canvas = document.createElement("canvas");
    canvas.style = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;'
    video.parentNode.insertBefore(canvas, video);

    var data = await getData();
    // var data = [{
    //     value: 'speed设为0为非滚动',
    //     time: 10, // 单位秒
    //     speed: 0
    // }, {
    //     value: 'time控制弹幕时间，单位秒',
    //     color: 'blue',
    //     time: 20
    // }];
    console.log(data);

    new CanvasBarrage(canvas, video, {data});
}

attachToBody();
