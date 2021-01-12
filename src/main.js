import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false
window.Hls = require('hls.js');
window.Dash = require('dash.js');

new Vue({
  render: h => h(App),
}).$mount('#app')
