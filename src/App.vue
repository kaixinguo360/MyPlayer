<template>
  <div id="app">
    <div id="d-player" class="d-player"></div>
  </div>
</template>

<script>
import Dplayer from 'dplayer'

export default {
  name: 'App',
  mounted() {
    const dp = new Dplayer({
      container: document.getElementById('d-player'),
      video: {
        url: 'https://jellyfin.kaixinguo.site/Items/e513c1b7a1f57cf0ec462ec4ac3cf120/Download?api_key=d54cc08c64ef4465a0fc55e56425a90c',
      },
    });
    console.log(dp)
  }
}
</script>

<style>
.d-player {
  width: 300px;
  height: 200px;
}
</style>
