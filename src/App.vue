<template>
  <div class="video-x">
    <!--    <canvas id="canvasBarrage" class="canvas-barrage"></canvas>-->
    <video id="videoBarrage" width="640" height="384"
           autoplay="autoplay"
           src="https://www.w3school.com.cn/i/movie.ogg"
           controls></video>
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
  }
}
</script>

<style>
.video-x {
  position: absolute;
  top: 100px;
  left: 100px;
  z-index: 0;
}
</style>
