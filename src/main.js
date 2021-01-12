import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false
window.Hls = require('shaka-player');

new Vue({
  render: h => h(App),
}).$mount('#app')
