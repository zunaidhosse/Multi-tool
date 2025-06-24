// ক্যাশের জন্য একটি নাম নির্ধারণ করুন। অ্যাপ আপডেট করার সময় এই সংস্করণ নম্বর পরিবর্তন করুন।
const CACHE_NAME = 'multi-tool-hub-cache-v3'; // ক্যাশের নতুন সংস্করণ

// অ্যাপটি অফলাইনে কাজ করার জন্য প্রয়োজনীয় ফাইলগুলির তালিকা
// নিশ্চিত করুন যে আপনার সমস্ত HTML, CSS, JS, এবং ছবি ফাইল এখানে অন্তর্ভুক্ত করা হয়েছে।
const urlsToCache = [
    './', // index.html এর জন্য রুট পাথ
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'icon-192.png', // আপনার অ্যাপ আইকন
    'icon-512.png'  // আপনার অ্যাপ আইকন
    // ভবিষ্যতে যদি কোনো নতুন ছবি বা অতিরিক্ত JS/CSS ফাইল যোগ করেন, তাহলে এখানে যোগ করুন।
];

// Service Worker ইনস্টল ইভেন্ট
// যখন Service Worker রেজিস্টার হয়, তখন এই ইভেন্টটি ফায়ার হয়।
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Opened cache');
                // সমস্ত প্রয়োজনীয় ফাইল ক্যাশে যোগ করুন
                return cache.addAll(urlsToCache)
                    .then(() => {
                        console.log('[Service Worker] All URLs added to cache successfully.');
                    })
                    .catch((error) => {
                        console.error('[Service Worker] Failed to add all URLs to cache:', error);
                        // এখানে আপনি একটি ফলব্যাক ক্যাশ যোগ করতে পারেন বা কিছু ফাইল মিস হলেও ইনস্টল করতে দিতে পারেন।
                    });
            })
            .catch((error) => {
                console.error('[Service Worker] Failed to open cache:', error);
            })
    );
});

// Service Worker ফেচ ইভেন্ট
// যখন অ্যাপটি কোনো রিসোর্সের জন্য রিকোয়েস্ট করে (যেমন একটি ছবি, স্ক্রিপ্ট), তখন এই ইভেন্টটি ফায়ার হয়।
self.addEventListener('fetch', (event) => {
    // শুধুমাত্র HTTP/HTTPS রিকোয়েস্টগুলি ইন্টারসেপ্ট করুন, chrome-extension:// বা অন্য প্রোটোকল নয়।
    if (event.request.url.startsWith('http') || event.request.url.startsWith('https')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // যদি ক্যাশে রিকোয়েস্টটি পাওয়া যায়, তাহলে ক্যাশে থেকে দিন
                    if (response) {
                        console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
                        return response;
                    }
                    // যদি ক্যাশে না পাওয়া যায়, তাহলে নেটওয়ার্ক থেকে আনার চেষ্টা করুন
                    console.log(`[Service Worker] Fetching from network: ${event.request.url}`);
                    return fetch(event.request)
                        .then((networkResponse) => {
                            // যদি নেটওয়ার্ক থেকে সফলভাবে আনা যায়, এবং রেসপন্সটি বৈধ হয়, তাহলে ক্যাশে যোগ করুন
                            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(event.request, responseToCache);
                                        console.log(`[Service Worker] Cached new resource: ${event.request.url}`);
                                    });
                            }
                            return networkResponse;
                        })
                        .catch((error) => {
                            console.error(`[Service Worker] Fetch failed for ${event.request.url}: `, error);
                            // যদি নেটওয়ার্কও ব্যর্থ হয়, এবং এটি একটি HTML পেজের রিকোয়েস্ট হয়,
                            // তবে অফলাইন ফলব্যাক পেজ দেখানো যেতে পারে (যদি থাকে)।
                            // বর্তমান সেটিংসে, এটি শুধু ব্যর্থ হবে যদি প্রয়োজনীয় ফাইলগুলি ক্যাশে না থাকে।
                        });
                })
        );
    }
});

// Service Worker অ্যাক্টিভেট ইভেন্ট
// যখন একটি নতুন Service Worker চালু হয়, তখন পুরানো ক্যাশগুলি পরিষ্কার করুন।
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        })
    );
    // নিশ্চিত করুন যে Service Worker অ্যাক্টিভেট হওয়ার সাথে সাথেই নতুন রিকোয়েস্টগুলি হ্যান্ডেল করতে পারে
    return self.clients.claim();
});
