// sw.js - Loader
// Deteksi platform dan muat service worker yang sesuai
const PLATFORM = /Android|iPhone|iPad|iPod|Mobile/i.test(self.navigator.userAgent || '') ? 'mobile' : 'desktop';
importScripts('/assets/js/sw-common.js', '/assets/js/sw-' + PLATFORM + '.js');
