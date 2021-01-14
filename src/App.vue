<template>
  <div class="video-x">
    <!--    <canvas id="canvasBarrage" class="canvas-barrage"></canvas>-->
    <video id="videoBarrage" width="640" height="384"
           autoplay="autoplay"
           src="https://ksv-video-publish.cdn.bcebos.com/ddf91e2c0b4a27174cce175d64b917d25d3decfc.mp4?auth_key=1657219913-0-0-c583c0b8059aab6200cbd241fd61aede"
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
