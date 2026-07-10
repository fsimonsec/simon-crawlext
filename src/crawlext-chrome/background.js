let requestQueue = [];
let isProcessing = false;
let activeRequests = 0;
const MAX_CONCURRENT = 4; 
const REQUEST_DELAY = 300; 
const MAX_RETRIES = 8;
const RETRY_DELAY = 2000;

const statusCache = new Map();
const CACHE_TTL = 900000; 

let requestCount = 0;
const PAUSE_AFTER = 30;
const PAUSE_DURATION = 5000;

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of statusCache) {
        if (now - value.timestamp > CACHE_TTL) {
            statusCache.delete(key);
        }
    }
}, CACHE_TTL);

function processQueue() {
    if (activeRequests >= MAX_CONCURRENT || requestQueue.length === 0) return;
    
    activeRequests++;
    const { url, callback, retries = 0 } = requestQueue.shift();

    const cached = statusCache.get(url);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        activeRequests--;
        callback(cached.status);
        setTimeout(processQueue, 50);
        return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const isHttps = url.startsWith('https://');
    const method = isHttps ? 'HEAD' : 'GET';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };

    const fetchOptions = {
        method: method,
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
        headers: headers
    };

    // اگر GET بود، Range اضافه کن
    if (method === 'GET') {
        fetchOptions.headers['Range'] = 'bytes=0-0';
    }

    fetch(url, fetchOptions)
    .then(response => {
        clearTimeout(timeoutId);
        const status = response.status;
        
        if (status === 429 && retries < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(1.3, retries);
            console.warn(`🔄 429 for ${url}, retry ${retries+1}/${MAX_RETRIES} in ${Math.round(delay/1000)}s`);
            setTimeout(() => {
                activeRequests--;
                requestQueue.unshift({ url, callback, retries: retries + 1 });
                setTimeout(processQueue, 100);
            }, delay);
            return;
        }

        if (status === 429) {
            console.warn(`⚠️ 429 after ${MAX_RETRIES} retries for ${url} → using 0`);
            statusCache.set(url, { status: 0, timestamp: Date.now() });
            activeRequests--;
            callback(0);
            setTimeout(processQueue, 100);
            return;
        }

        statusCache.set(url, { status, timestamp: Date.now() });
        activeRequests--;
        callback(status);
        setTimeout(processQueue, 50);
    })
    .catch((error) => {
        clearTimeout(timeoutId);
        
        if (retries < MAX_RETRIES && error.name !== 'AbortError') {
            const delay = RETRY_DELAY * Math.pow(1.3, retries);
            setTimeout(() => {
                activeRequests--;
                requestQueue.unshift({ url, callback, retries: retries + 1 });
                setTimeout(processQueue, 100);
            }, delay);
            return;
        }

        statusCache.set(url, { status: 0, timestamp: Date.now() });
        activeRequests--;
        callback(0);
        setTimeout(processQueue, 100);
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkStatus') {
        const url = request.url;
        if (!url) {
            sendResponse({ status: 0 });
            return true;
        }

        const cached = statusCache.get(url);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            sendResponse({ status: cached.status });
            return true;
        }

        requestQueue.push({
            url: url,
            callback: (status) => {
                sendResponse({ status: status });
            },
            retries: 0
        });

        setTimeout(processQueue, 10);
        return true;
    }
});

console.log('✅ Simon-Recon background worker started with parallel processing');