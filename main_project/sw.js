/**
 * ==============================================================================
 * METRO ROUTE FINDER - SERVICE WORKER (PWA)
 * ==============================================================================
 * Architecture:
 * 1. Cache-First (Static UI, CSS, JS, SVG) -> For 0ms loading.
 * 2. Stale-While-Revalidate (JSON Data) -> Shows fast cached data, updates in background.
 * ==============================================================================
 */

const CACHE_NAME = 'metro-pwa-cache-v3';
const DATA_CACHE_NAME = 'metro-data-cache-v3';

// कोर एसेट्स जो इंस्टॉल होते ही 100% कैशे हो जाने चाहिए (ऑफ़लाइन ऐप स्टार्ट के लिए)
const CORE_ASSETS = [
	'./',
	'./index.html',
	'./css/pages/index.css',
	'./css/base/base.css',
	'./js/pages/home.js',
	'./js/core/metro-data-store.js',
	'./manifest.webmanifest',
	'./assets/images/site_icon.svg'
];

// इंस्टॉल इवेंट: कोर एसेट्स को कैशे में डालना
self.addEventListener('install', (event) => {
	self.skipWaiting(); // नया वर्कर तुरंत एक्टिवेट करें
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(CORE_ASSETS);
		})
	);
});

// एक्टिवेट इवेंट: पुराने कैशे (v1, v2) को डिलीट करना ताकि स्टोरेज न भरे
self.addEventListener('activate', (event) => {
	event.waitUntil(
		self.clients.claim().then(() => {
			return caches.keys().then((cacheNames) => {
				return Promise.all(
					cacheNames.map((name) => {
						if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
							return caches.delete(name);
						}
					})
				);
			});
		})
	);
});

// फ़ेच इवेंट (स्मार्ट कैशिंग लॉजिक)
self.addEventListener('fetch', (event) => {
	const requestUrl = new URL(event.request.url);

	// ONLY USE GET REQUESTS
	if (event.request.method !== 'GET') return;

	// Stale-While-Revalidate Strategy for EVERYTHING (JSON, CSS, JS, HTML)
	// This gives 0ms instant loading from cache, but always updates the cache in the background!
	// You will NEVER need to manually bump the version (v1 to v2) ever again!
	event.respondWith(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.match(event.request).then((cachedResponse) => {
				const fetchPromise = fetch(event.request).then((networkResponse) => {
					// Update cache in the background if successful
					if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
						cache.put(event.request, networkResponse.clone());
					}
					return networkResponse;
				}).catch(() => {
					// Offline fallback for HTML
					if (event.request.headers.get('accept').includes('text/html')) {
						return caches.match('./index.html');
					}
				});
				
				// Return cached response instantly (0ms), or wait for network if not in cache
				return cachedResponse || fetchPromise;
			});
		})
	);
});