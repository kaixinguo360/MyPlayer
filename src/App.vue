<template>
  <div class="video-x">
    <!--    <canvas id="canvasBarrage" class="canvas-barrage"></canvas>-->
    <video id="videoBarrage" width="640" height="384"
           autoplay="autoplay"
           src="https://jellyfin.kaixinguo.site/Items/e513c1b7a1f57cf0ec462ec4ac3cf120/Download?api_key=d54cc08c64ef4465a0fc55e56425a90c"
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
