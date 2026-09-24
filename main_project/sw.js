/**
 * ==============================================================================
 * METRO ROUTE FINDER - SERVICE WORKER (PWA)
 * ==============================================================================
 * Architecture:
 * 1. Cache-First (Static UI, CSS, JS, SVG) -> For 0ms loading.
 * 2. Stale-While-Revalidate (JSON Data) -> Shows fast cached data, updates in background.
 * ==============================================================================
 */

const CACHE_NAME = 'metro-pwa-cache-v1';
const DATA_CACHE_NAME = 'metro-data-cache-v1';

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

	// 1. JSON Data Files (cities/ folder) -> Stale-While-Revalidate
	if (requestUrl.pathname.endsWith('.json')) {
		event.respondWith(
			caches.open(DATA_CACHE_NAME).then((cache) => {
				return cache.match(event.request).then((cachedResponse) => {
					const fetchPromise = fetch(event.request).then((networkResponse) => {
						cache.put(event.request, networkResponse.clone());
						return networkResponse;
					}).catch(() => {
						// इंटरनेट नहीं है और कैशे भी नहीं है
					});
					
					return cachedResponse || fetchPromise;
				});
			})
		);
		return;
	}

	// 2. Static Assets (CSS, JS, SVG, HTML) -> Cache-First, Fallback to Network
	if (event.request.method === 'GET') {
		event.respondWith(
			caches.match(event.request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse; // 0ms लोड
				}
				// यदि कैशे में नहीं है, तो नेटवर्क से लाएं और कैशे कर लें
				return fetch(event.request).then((networkResponse) => {
					// 3rd party URLs या अमान्य रिस्पॉन्स को कैशे न करें
					if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
						return networkResponse;
					}
					const responseToCache = networkResponse.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});
					return networkResponse;
				}).catch(() => {
					// यदि HTML पेज फेल हो जाए और इंटरनेट न हो, तो index.html दें
					if (event.request.headers.get('accept').includes('text/html')) {
						return caches.match('./index.html');
					}
				});
			})
		);
	}
});