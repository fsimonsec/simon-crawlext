
(function() {
    'use strict';

    let isRunning = false;
    let isReconOpen = false;
    let allUrls = new Set();
    let paramUrls = new Set();
    let fileUrls = new Set();
    let specialUrls = new Set();
    let apiUrls = new Set();
    let originalParamValues = new Map();

    function getStats() {
        return {
            total: allUrls.size,
            links: allUrls.size,
            api: apiUrls.size,
            files: fileUrls.size,
            params: paramUrls.size,
            special: specialUrls.size
        };
    }

    let currentTab = 'all';
    let currentTestValue = '';

    let urlStatusCache = new Map();
    let statusFilterActive = false;
    let selectedStatusCodes = new Set();
    let hiddenStatusCodes = new Set();
    let allSelected = true;
    let isScanning = false;
    let tagStates = new Map();

    const FILE_EXTS = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.ttf', '.eot',
        '.pdf', '.zip', '.json', '.xml', '.txt', '.csv', '.mp4', '.webm', '.env', '.config',
        '.yml', '.yaml', '.log', '.bak', '.old', '.wasm', '.map', '.webp', '.gif', '.bmp',
        '.tiff', '.psd', '.ai', '.eps', '.sql', '.db', '.sqlite', '.sh', '.bash', '.zsh',
        '.conf', '.ini', '.cfg', '.htaccess', '.htpasswd', '.gitignore', '.dockerignore',
        '.eslintrc', '.prettierrc', '.babelrc', '.npmrc', '.yarnrc', '.editorconfig'
    ];

    const SPECIAL_PATTERNS = [
        'robots.txt', 'sitemap.xml', 'sitemap_index.xml', 'sitemap.gz', 'xmlrpc.php',
        'wp-login.php', 'wp-admin', '.htaccess', '.git', '.svn', '.env', 'config.php',
        '.well-known', 'crossdomain.xml', 'security.txt', 'humans.txt', 'ads.txt',
        '.htpasswd', 'package.json', 'composer.json', 'package-lock.json', 'yarn.lock',
        'tsconfig.json', 'webpack.config.js', 'vite.config.js', 'rollup.config.js',
        'babel.config.js', '.eslintrc.js', '.prettierrc.js', '.stylelintrc.js',
        'Dockerfile', 'docker-compose.yml', '.travis.yml', '.circleci', '.github'
    ];

    const API_PATTERNS = [
        /\/api\//i, /\/v[0-9]+\//i, /\/rest\//i, /\/graphql/i, /\/gql/i,
        /\/swagger/i, /\/openapi/i, /\/docs/i, /\/redoc/i, /\/_api\//i,
        /\/ajax\//i, /\/json\//i, /\/rpc\//i, /\/soap\//i, /\/webservice/i,
        /\/service/i, /\/internal/i, /\/private/i, /\/admin\/api/i,
        /\.json$/i, /\.xml$/i, /\.yaml$/i, /\.yml$/i,
        /\/oauth/i, /\/auth/i, /\/login/i, /\/logout/i, /\/register/i,
        /\/signup/i, /\/user/i, /\/users/i, /\/profile/i, /\/account/i,
        /\/order/i, /\/orders/i, /\/product/i, /\/products/i, /\/payment/i,
        /\/payments/i, /\/checkout/i, /\/cart/i, /\/upload/i, /\/download/i,
        /\/export/i, /\/import/i, /\/search/i, /\/query/i, /\/filter/i,
        /\/sort/i, /\/paginate/i, /\/list/i, /\/get/i, /\/post/i, /\/put/i,
        /\/delete/i, /\/patch/i, /\/head/i, /\/options/i, /\/trace/i,
        /\/webhook/i, /\/callback/i, /\/notify/i, /\/event/i, /\/stream/i,
        /\/socket/i, /\/ws\//i, /\/wss\//i, /\/realtime/i, /\/live/i,
        /\/feed/i, /\/timeline/i, /\/inbox/i, /\/outbox/i, /\/draft/i,
        /\/spam/i, /\/trash/i, /\/starred/i, /\/unread/i, /\/read/i,
        /\/sent/i, /\/received/i, /\/invite/i, /\/accept/i, /\/decline/i,
        /\/join/i, /\/leave/i, /\/create/i, /\/update/i, /\/delete/i,
        /\/archive/i, /\/restore/i, /\/lock/i, /\/unlock/i, /\/approve/i,
        /\/reject/i, /\/submit/i, /\/cancel/i, /\/retry/i, /\/abort/i
    ];

    const TAB_COLORS = {
        all: { bg: '#6c2bd9', border: '#8b5cf6' },
        params: { bg: '#7c3aed', border: '#a78bfa' },
        api: { bg: '#8b5cf6', border: '#c4b5fd' },
        files: { bg: '#5b21b6', border: '#7c3aed' },
        special: { bg: '#4c1d95', border: '#6c2bd9' }
    };

    const URL_PATTERNS = [
        /https?:\/\/[^\s"'`<>(){}[\]]+/g,
        /\/[a-zA-Z0-9_\-./?=&%#]+/g,
        /\b[a-zA-Z0-9_\-]+=[a-zA-Z0-9_\-]+\b/g
    ];

    function getProtocol() { return location.protocol; }
    function getOrigin() { return location.origin; }
    function getMainDomain() { return location.hostname; }

    function getCompleteUrl(url) {
        if (!url) return '';
        url = url.trim();
        if (url.startsWith('//')) return getProtocol() + url;
        if (url.startsWith('/')) return getOrigin() + url;
        if (/^https?:\/\//i.test(url)) return url;
        try { return new URL(url, location.href).href; } catch { try { return new URL(url, location.origin).href; } catch { return url; } }
    }

    function fullUrl(url) { return getCompleteUrl(url); }

    function isSpecialPath(path) {
        const special = [
            '/admin', '/login', '/logout', '/register', '/signup', '/profile',
            '/account', '/dashboard', '/panel', '/console', '/api', '/rest',
            '/graphql', '/gql', '/swagger', '/docs', '/redoc', '/oauth',
            '/auth', '/user', '/users', '/order', '/orders', '/product',
            '/products', '/payment', '/payments', '/checkout', '/cart',
            '/upload', '/download', '/export', '/import', '/search', '/query',
            '/filter', '/sort', '/paginate', '/list', '/get', '/post', '/put',
            '/delete', '/patch', '/webhook', '/callback', '/notify', '/event',
            '/stream', '/socket', '/realtime', '/live', '/feed', '/timeline',
            '/inbox', '/outbox', '/draft', '/spam', '/trash', '/starred',
            '/unread', '/read', '/sent', '/received', '/invite', '/accept',
            '/decline', '/join', '/leave', '/create', '/update', '/delete',
            '/archive', '/restore', '/lock', '/unlock', '/approve', '/reject',
            '/submit', '/cancel', '/retry', '/abort', '/backup', '/restore',
            '/migrate', '/seed', '/deploy', '/rollback', '/config', '/settings',
            '/preferences', '/options', '/debug', '/test', '/demo', '/sandbox',
            '/dev', '/staging', '/prod', '/production', '/stage', '/backoffice',
            '/control', '/monitor', '/health', '/status', '/ping'
        ];
        const p = path.toLowerCase();
        return special.some(s => p === s || p.startsWith(s + '/') || p.includes('/' + s + '/') || p.endsWith('/' + s));
    }

    function isInScope(url) {
        if (!url || url.length < 3) return false;
        if (url.length < 4) return false;
        if (/^\/[&?]$/.test(url)) return false;
        if (/^\/%/.test(url)) return false;
        if (/^\/#/.test(url)) return false;
        if (/^\/\/[a-z]$/.test(url)) return false;
        if (/^\/\/[a-z]#/.test(url)) return false;
        if (/^\/&[a-z]+;?$/.test(url)) return false;
        if (/^\/&[a-z]+$/.test(url)) return false;
        if (/&[a-z]{2,7};/.test(url) && url.split('&').length > 2) return false;
        if (/^\/[^a-zA-Z0-9_\-./]/.test(url) && url.length < 6) return false;
        if (/^\/[-–—]+$/.test(url)) return false;
        if (/^\/-\/[a-z]$/.test(url)) return false;
        if (/^\/\.[a-z]$/.test(url)) return false;
        if (/^\/\.\/$/.test(url)) return false;
        if (/^\/\/[a-z0-9-]+\.(com|org|net|io)\/?$/.test(url) && url.split('.').length < 4) return false;
        if (/^\/\/localhost/.test(url)) return false;
        if (/^\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/.test(url)) return false;

        if (/^\/(exec|source|replace|toString|call|apply|bind|constructor|prototype|__proto__|hasOwnProperty|isPrototypeOf|length|name|arguments|caller|callee|valueOf|toLocaleString|propertyIsEnumerable)$/.test(url)) return false;
        if (/\/\.(exec|source|test|call|apply|bind)$/.test(url)) return false;

        const uselessExts = /\.(png|jpg|jpeg|gif|bmp|webp|svg|ico|woff|woff2|ttf|eot|otf|mp4|webm|avi|mov|mp3|wav|flac|zip|rar|7z|tar|gz|bz2|pdf|doc|docx|xls|xlsx|ppt|pptx|exe|dmg|iso|torrent|apk|deb|rpm|dmg)$/i;
        if (uselessExts.test(url) && !url.includes('?')) return false;

        const sensitive = /\.(env|config|conf|ini|yml|yaml|json|xml|sql|db|sqlite|sqlite3|db3|sdb|fdb|mdb|accdb|pdb|dbf|log|bak|old|swp|swo|tmp|backup|save|orig|dump|dmp|sql.gz|sql.bak)$/i;
        if (sensitive.test(url)) return true;

        if (/\.(js|css)$/i.test(url) && url.includes('?')) return true;

        const mainDomain = getMainDomain();
        const protocol = getProtocol();

        if (url.startsWith('/') && !url.startsWith('//')) {
            const parts = url.split('/').filter(p => p);
            if (parts.length === 0) return false;
            const first = parts[0];
            if (first.length < 2) return false;
            if (isSpecialPath(url)) return true;
            if (parts.length >= 2) return true;
            if (parts.length === 1 && parts[0].length > 2) return true;
            return false;
        }

        if (url.startsWith('//')) {
            const full = protocol + url;
            try {
                const u = new URL(full);
                const d = u.hostname;
                if (d === mainDomain || d.endsWith('.' + mainDomain)) return true;
                const mainParts = mainDomain.split('.');
                if (mainParts.length >= 2) {
                    const base = mainParts.slice(-2).join('.');
                    if (d.endsWith('.' + base) || d === base) return true;
                }
                return false;
            } catch { return false; }
        }

        try {
            const u = new URL(url);
            const d = u.hostname;
            if (d === mainDomain || d.endsWith('.' + mainDomain)) return true;
            const mainParts = mainDomain.split('.');
            if (mainParts.length >= 2) {
                const base = mainParts.slice(-2).join('.');
                if (d.endsWith('.' + base) || d === base) return true;
            }
            return false;
        } catch { return false; }
    }

    function isAPI(url) {
        for (const pattern of API_PATTERNS) {
            if (pattern.test(url)) return true;
        }
        return false;
    }

    function extractAndStoreParams(url) {
        if (!url.includes('?')) return;
        const full = getCompleteUrl(url);
        if (!full) return;
        if (!originalParamValues.has(full)) {
            originalParamValues.set(full, full);
        }
    }

    function addUrl(url) {
        if (!url || url.length < 3) return;
        url = url.replace(/\/(?=\?|$)/, '');
        try { new URL(url, location.href); } catch { return; }
        if (!isInScope(url)) return;

        if (url.includes('?')) {
            try {
                const urlObj = new URL(url, location.href);
                const params = new URLSearchParams(urlObj.search);
                if (params.toString() === '' && !isSpecialPath(urlObj.pathname)) return;
                const useless = ['utm_', 'fbclid', 'gclid', 'ref', 'source', 'medium', 'campaign', 'term', 'content', 'mkt', 'trk', 'mc_', 'utm', 'pk_', 'mtm_'];
                let hasUseful = false;
                for (const [key] of params) {
                    if (!useless.some(u => key.startsWith(u))) { hasUseful = true; break; }
                }
                if (!hasUseful && !isAPI(url) && !isSpecialPath(urlObj.pathname)) return;
            } catch {}
        }

        allUrls.add(url);
        if (url.includes('?')) {
            paramUrls.add(url);
            extractAndStoreParams(url);
        }
        if (FILE_EXTS.some(ext => url.includes(ext))) fileUrls.add(url);
        if (SPECIAL_PATTERNS.some(pattern => url.toLowerCase().includes(pattern))) specialUrls.add(url);
        if (isAPI(url)) apiUrls.add(url);
    }

    function extractUrlsFromText(text) {
        if (!text || typeof text !== 'string') return;
        for (const pattern of URL_PATTERNS) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const url = match[0];
                if (url && url.length > 2) addUrl(url);
            }
        }
    }

    function crawlPage(onDone) {
        const attrs = ['href', 'src', 'action', 'data-url', 'data-src', 'data-href', 'data-srcset',
                       'data-original', 'data-lazy', 'data-background', 'data-image', 'data-file',
                       'data-link', 'data-uri', 'data-path', 'data-endpoint'];
        document.querySelectorAll('*').forEach(el => {
            for (const attr of attrs) {
                const val = el.getAttribute(attr);
                if (val) {
                    if (attr === 'data-srcset' || attr === 'srcset') {
                        val.split(',').forEach(part => {
                            const clean = part.trim().split(/\s+/)[0];
                            if (clean) addUrl(clean);
                        });
                    } else {
                        addUrl(val);
                    }
                }
            }
        });

        try {
            const entries = performance.getEntriesByType('resource');
            for (const entry of entries) {
                if (entry.name) addUrl(entry.name);
            }
        } catch {}

        const html = document.documentElement.outerHTML;
        extractUrlsFromText(html);

        document.querySelectorAll('script:not([src])').forEach(script => {
            if (script.textContent) extractUrlsFromText(script.textContent);
        });
        document.querySelectorAll('style').forEach(style => {
            if (style.textContent) extractUrlsFromText(style.textContent);
        });

        const scripts = document.querySelectorAll('script[src]');
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        let pending = 0;

        function done() {
            pending--;
            if (pending <= 0) { pending = 0; if (onDone) onDone(); }
        }

        for (const script of scripts) {
            const src = script.getAttribute('src');
            if (!src) continue;
            const fullSrc = getCompleteUrl(src);
            if (!fullSrc) continue;
            addUrl(fullSrc);
            pending++;
            fetch(fullSrc).then(res => res.text()).then(text => {
                extractUrlsFromText(text);
                done();
            }).catch(done);
        }

        for (const link of links) {
            const href = link.getAttribute('href');
            if (!href) continue;
            const fullHref = getCompleteUrl(href);
            if (!fullHref) continue;
            addUrl(fullHref);
            pending++;
            fetch(fullHref).then(res => res.text()).then(text => {
                extractUrlsFromText(text);
                done();
            }).catch(done);
        }

        if (pending === 0) { if (onDone) onDone(); }
        else { setTimeout(() => { if (pending > 0) { pending = 0; if (onDone) onDone(); } }, 10000); }
    }

    function copyToClipboard(text, count) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(count ? `Copied ${count} items!` : 'Copied!');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
            showToast(count ? `Copied ${count} items!` : 'Copied!');
        });
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#7c3aed;color:#fff;padding:8px 24px;border-radius:20px;font-size:14px;z-index:999999;font-family:Segoe UI,sans-serif;box-shadow:0 4px 15px rgba(124,58,237,0.4);';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
    }

    function resetParams() {
        const newParamUrls = new Set();
        for (const url of allUrls) {
            if (url.includes('?')) {
                const full = getCompleteUrl(url);
                if (originalParamValues.has(full)) {
                    newParamUrls.add(originalParamValues.get(full));
                } else {
                    newParamUrls.add(url);
                }
            }
        }
        paramUrls = newParamUrls;
        renderList(currentTab);
        showToast('✅ Reset to original values');
    }

    function checkStatusCode(url, callback) {
        const full = getCompleteUrl(url);
        if (!full) {
            callback(0);
            return;
        }
        try {
            const urlObj = new URL(full);
            if (urlObj.origin === location.origin) {
                fetch(full, {
                    method: 'HEAD',
                    redirect: 'follow',
                    cache: 'no-store',
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReconBot/2.0)' }
                })
                .then(response => {
                    callback(response.status);
                })
                .catch(() => {
                    callback(0);
                });
                return;
            }
        } catch {}

        chrome.runtime.sendMessage(
            { action: 'checkStatus', url: full },
            (response) => {
                if (chrome.runtime.lastError) {
                    callback(0);
                    return;
                }
                const status = response && response.status ? response.status : 0;
                callback(status);
            }
        );
    }

    function getStatusColor(status) {
        if (status >= 200 && status < 300) return '#5fd28a';
        if (status >= 300 && status < 400) return '#fbbf24';
        if (status >= 400 && status < 500) return '#f87171';
        if (status >= 500) return '#ef4444';
        return '#6b7280';
    }

    function showReconWindow() {
        if (isReconOpen) return;
        isReconOpen = true;
        isRunning = false;

        const old = document.getElementById('simon-tabs');
        if (old) { old.remove(); isReconOpen = false; return; }

        const container = document.createElement('div');
        container.id = 'simon-tabs';
        container.style.cssText = 'position:fixed;top:20px;right:20px;width:750px;max-height:90vh;background:#0a0a0f;border:1px solid #2d1b4e;border-radius:14px;padding:0;z-index:99999;box-shadow:0 20px 60px rgba(0,0,0,0.9),0 0 40px rgba(124,58,237,0.15);font-family:Segoe UI,system-ui,sans-serif;color:#e6edf3;display:flex;flex-direction:column;overflow:hidden;';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid #2d1b4e;background:#0f0a1a;border-radius:14px 14px 0 0;flex-shrink:0;';
        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-weight:700;font-size:16px;color:#a78bfa;display:flex;align-items:center;gap:12px;';
        titleSpan.innerHTML = '🔍 Simon Recon';
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'color:#6b7280;font-size:18px;cursor:pointer;transition:0.2s;line-height:1;padding:0 4px;';
        closeBtn.onmouseover = () => closeBtn.style.color = '#a78bfa';
        closeBtn.onmouseout = () => closeBtn.style.color = '#6b7280';
        closeBtn.onclick = () => { container.remove(); isReconOpen = false; isRunning = false; };
        titleSpan.appendChild(closeBtn);
        header.appendChild(titleSpan);
        const countSpan = document.createElement('span');
        countSpan.style.cssText = 'font-size:12px;color:#8b5cf6;background:#1a0f2e;padding:2px 12px;border-radius:12px;border:1px solid #2d1b4e;';
        countSpan.textContent = allUrls.size + ' total';
        header.appendChild(countSpan);
        container.appendChild(header);

        const tabData = [
            { id: 'all', label: 'All', data: [...allUrls], color: '#8b5cf6' },
            { id: 'params', label: 'Params', data: [...paramUrls], color: '#a78bfa' },
            { id: 'api', label: 'API', data: [...apiUrls], color: '#c4b5fd' },
            { id: 'files', label: 'Files', data: [...fileUrls], color: '#7c3aed' },
            { id: 'special', label: 'Special', data: [...specialUrls], color: '#6c2bd9' }
        ];

        const tabsDiv = document.createElement('div');
        tabsDiv.style.cssText = 'display:flex;gap:4px;padding:10px 20px;background:#0a0a0f;border-bottom:1px solid #1a0f2e;flex-shrink:0;flex-wrap:wrap;align-items:center;';
        currentTab = 'all';
        const tabButtons = [];
        for (const tab of tabData) {
            const btn = document.createElement('button');
            btn.textContent = `${tab.label} (${tab.data.length})`;
            btn.dataset.tab = tab.id;
            btn.style.cssText = 'background:' + (tab.id === 'all' ? '#1a0f2e' : '#0a0a0f') + ';border:1px solid ' + (tab.id === 'all' ? tab.color : '#2d1b4e') + ';color:' + (tab.id === 'all' ? tab.color : '#6b7280') + ';padding:4px 14px;border-radius:16px;font-size:12px;cursor:pointer;transition:0.2s;font-weight:' + (tab.id === 'all' ? '600' : '400') + ';';
            btn.onmouseover = () => { if (tab.id !== currentTab) btn.style.background = '#1a0f2e'; };
            btn.onmouseout = () => { if (tab.id !== currentTab) btn.style.background = '#0a0a0f'; };
            btn.onclick = () => {
                currentTab = tab.id;
                for (const b of tabButtons) {
                    const tb = tabData.find(t => t.id === b.dataset.tab);
                    b.style.background = b.dataset.tab === currentTab ? '#1a0f2e' : '#0a0a0f';
                    b.style.borderColor = b.dataset.tab === currentTab ? tb.color : '#2d1b4e';
                    b.style.color = b.dataset.tab === currentTab ? tb.color : '#6b7280';
                    b.style.fontWeight = b.dataset.tab === currentTab ? '600' : '400';
                }
                renderList(currentTab);
            };
            tabsDiv.appendChild(btn);
            tabButtons.push(btn);
        }
        container.appendChild(tabsDiv);

        const toolBar = document.createElement('div');
        toolBar.style.cssText = 'display:flex;gap:8px;padding:6px 16px;background:#0a0a0f;border-bottom:1px solid #1a0f2e;align-items:center;flex-shrink:0;flex-wrap:wrap;';

        const labelSpan = document.createElement('span');
        labelSpan.style.cssText = 'font-size:11px;color:#8b5cf6;';
        labelSpan.textContent = 'Test:';
        toolBar.appendChild(labelSpan);

        const testInput = document.createElement('input');
        testInput.id = 'test-value-input';
        testInput.type = 'text';
        testInput.placeholder = 'Enter value...';
        testInput.value = '';
        testInput.style.cssText = 'background:#0f0a1a;border:1px solid #2d1b4e;color:#e6edf3;padding:3px 10px;border-radius:12px;font-size:12px;width:100px;';
        toolBar.appendChild(testInput);

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.style.cssText = 'background:#7c3aed;border:1px solid #8b5cf6;color:#fff;padding:3px 16px;border-radius:12px;font-size:12px;cursor:pointer;';
        toolBar.appendChild(applyBtn);

        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↺ Reset';
        resetBtn.style.cssText = 'background:#4a1a6b;border:1px solid #6c2bd9;color:#c4b5fd;padding:3px 16px;border-radius:12px;font-size:12px;cursor:pointer;transition:0.2s;';
        resetBtn.onmouseover = () => resetBtn.style.background = '#6c2bd9';
        resetBtn.onmouseout = () => resetBtn.style.background = '#4a1a6b';
        resetBtn.onclick = () => { resetParams(); };
        toolBar.appendChild(resetBtn);

        const spacer = document.createElement('span');
        spacer.style.cssText = 'flex:1;';
        toolBar.appendChild(spacer);

        const copyAllContainer = document.createElement('span');
        copyAllContainer.id = 'copy-all-container';
        toolBar.appendChild(copyAllContainer);

        container.appendChild(toolBar);

        const statusBar = document.createElement('div');
        statusBar.style.cssText = 'display:flex;gap:8px;padding:4px 16px 8px;background:#0a0a0f;border-bottom:1px solid #1a0f2e;align-items:center;flex-shrink:0;flex-wrap:wrap;';

        const statusLabel = document.createElement('span');
        statusLabel.style.cssText = 'font-size:11px;color:#8b5cf6;';
        statusLabel.textContent = 'Status:';
        statusBar.appendChild(statusLabel);

        const checkStatusBtn = document.createElement('button');
        checkStatusBtn.id = 'check-status-btn';
        checkStatusBtn.textContent = '🔍 Check Status';
        checkStatusBtn.style.cssText = 'background:#2d1b4e;border:1px solid #6b7280;color:#9ca3af;padding:3px 14px;border-radius:12px;font-size:11px;cursor:pointer;transition:0.2s;';
        checkStatusBtn.onmouseover = () => { if (!isScanning) checkStatusBtn.style.background = '#3a2a5a'; };
        checkStatusBtn.onmouseout = () => { if (!isScanning) checkStatusBtn.style.background = '#2d1b4e'; };
        checkStatusBtn.onclick = () => {
            if (!isScanning) {
                urlStatusCache.clear();
                tagStates.clear();
                selectedStatusCodes.clear();
                hiddenStatusCodes.clear();
                statusFilterActive = false;
                allSelected = true;
                document.querySelectorAll('.status-tag').forEach(t => t.remove());
                allTag.style.background = '#7c3aed';
                allTag.style.color = '#fff';
                allTag.style.borderColor = '#8b5cf6';
                scanStatusCodes();
            }
        };
        statusBar.appendChild(checkStatusBtn);

        const tagsContainer = document.createElement('div');
        tagsContainer.id = 'status-tags-container';
        tagsContainer.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;flex:1;';
        statusBar.appendChild(tagsContainer);

        const allTag = document.createElement('span');
        allTag.id = 'status-tag-all';
        allTag.textContent = 'All';
        allTag.style.cssText = 'background:#7c3aed;color:#fff;padding:2px 12px;border-radius:12px;font-size:11px;cursor:pointer;border:1px solid #8b5cf6;user-select:none;transition:0.2s;';
        allTag.onclick = () => {
            if (isScanning) return;
            allSelected = true;
            statusFilterActive = false;
            selectedStatusCodes.clear();
            hiddenStatusCodes.clear();
            tagStates.clear();
            document.querySelectorAll('.status-tag').forEach(t => {
                t.dataset.state = '0';
                t.style.background = '#1a0f2e';
                t.style.color = '#6b7280';
                t.style.borderColor = '#2d1b4e';
                t.textContent = t.dataset.code;
                t.classList.remove('active', 'hidden');
            });
            allTag.style.background = '#7c3aed';
            allTag.style.color = '#fff';
            allTag.style.borderColor = '#8b5cf6';
            renderList(currentTab);
        };
        tagsContainer.appendChild(allTag);

        function buildStatusTags(statusCodes) {
            const existingTags = tagsContainer.querySelectorAll('.status-tag');
            existingTags.forEach(t => t.remove());

            const sorted = Array.from(statusCodes).sort((a,b) => a-b);
            for (const code of sorted) {
                const tag = document.createElement('span');
                tag.className = 'status-tag';
                tag.textContent = code;
                tag.dataset.code = code;
                tag.dataset.state = '0';
                tag.style.cssText = 'background:#1a0f2e;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;cursor:pointer;border:1px solid #2d1b4e;user-select:none;transition:0.2s;';
                tag.onclick = function() {
                    if (isScanning) return;
                    const code = parseInt(this.dataset.code);
                    const currentState = parseInt(this.dataset.state);

                    if (allSelected) {
                        allSelected = false;
                        allTag.style.background = '#1a0f2e';
                        allTag.style.color = '#6b7280';
                        allTag.style.borderColor = '#2d1b4e';
                        statusFilterActive = false;
                        selectedStatusCodes.clear();
                        hiddenStatusCodes.clear();
                        tagStates.clear();
                        document.querySelectorAll('.status-tag').forEach(t => {
                            t.dataset.state = '0';
                            t.style.background = '#1a0f2e';
                            t.style.color = '#6b7280';
                            t.style.borderColor = '#2d1b4e';
                            t.textContent = t.dataset.code;
                            t.classList.remove('active', 'hidden');
                        });
                    }

                    let newState;
                    if (currentState === 0) newState = 1;
                    else if (currentState === 1) newState = 2;
                    else newState = 0;

                    this.dataset.state = newState;
                    tagStates.set(code, newState);

                    if (newState === 1) {
                        this.style.background = '#10b981';
                        this.style.color = '#fff';
                        this.style.borderColor = '#34d399';
                        this.textContent = '✓ ' + code;
                        this.classList.add('active');
                        this.classList.remove('hidden');
                        selectedStatusCodes.add(code);
                        hiddenStatusCodes.delete(code);
                    } else if (newState === 2) {
                        this.style.background = '#ef4444';
                        this.style.color = '#fff';
                        this.style.borderColor = '#f87171';
                        this.textContent = '✕ ' + code;
                        this.classList.add('hidden');
                        this.classList.remove('active');
                        selectedStatusCodes.delete(code);
                        hiddenStatusCodes.add(code);
                    } else {
                        this.style.background = '#1a0f2e';
                        this.style.color = '#6b7280';
                        this.style.borderColor = '#2d1b4e';
                        this.textContent = code;
                        this.classList.remove('active', 'hidden');
                        selectedStatusCodes.delete(code);
                        hiddenStatusCodes.delete(code);
                    }

                    if (selectedStatusCodes.size > 0 || hiddenStatusCodes.size > 0) {
                        statusFilterActive = true;
                    } else {
                        statusFilterActive = false;
                        allSelected = true;
                        allTag.style.background = '#7c3aed';
                        allTag.style.color = '#fff';
                        allTag.style.borderColor = '#8b5cf6';
                    }

                    renderList(currentTab);
                };
                tagsContainer.appendChild(tag);
            }

            if (!allSelected && selectedStatusCodes.size === 0 && hiddenStatusCodes.size === 0) {
                allSelected = true;
                allTag.style.background = '#7c3aed';
                allTag.style.color = '#fff';
                allTag.style.borderColor = '#8b5cf6';
                statusFilterActive = false;
            }
        }

        function scanStatusCodes() {
            if (isScanning) return;
            isScanning = true;
            statusFilterActive = false;
            selectedStatusCodes.clear();
            hiddenStatusCodes.clear();
            tagStates.clear();
            allSelected = true;
            allTag.style.background = '#7c3aed';
            allTag.style.color = '#fff';
            allTag.style.borderColor = '#8b5cf6';
            document.querySelectorAll('.status-tag').forEach(t => t.remove());

            checkStatusBtn.textContent = '⏳ Scanning...';
            checkStatusBtn.style.background = '#4a1a6b';
            checkStatusBtn.style.borderColor = '#fbbf24';
            checkStatusBtn.style.color = '#fbbf24';
            checkStatusBtn.disabled = true;

            const data = tabData.find(t => t.id === currentTab)?.data || [];
            if (data.length === 0) {
                showToast('ℹ️ No URLs to check');
                isScanning = false;
                checkStatusBtn.textContent = '🔍 Check Status';
                checkStatusBtn.style.background = '#2d1b4e';
                checkStatusBtn.style.borderColor = '#6b7280';
                checkStatusBtn.style.color = '#9ca3af';
                checkStatusBtn.disabled = false;
                return;
            }

            const toCheck = data.filter(link => !urlStatusCache.has(link));
            if (toCheck.length === 0) {
                isScanning = false;
                checkStatusBtn.textContent = '🔄 Re-check';
                checkStatusBtn.style.background = '#065f46';
                checkStatusBtn.style.borderColor = '#10b981';
                checkStatusBtn.style.color = '#5fd28a';
                checkStatusBtn.disabled = false;
                const existingCodes = new Set();
                for (const link of data) {
                    const cached = urlStatusCache.get(link);
                    if (cached && cached.status > 0) {
                        existingCodes.add(cached.status);
                    }
                }
                if (existingCodes.size > 0) {
                    buildStatusTags(existingCodes);
                    showToast(`✅ ${existingCodes.size} status codes found`);
                } else {
                    showToast('ℹ️ No valid status codes');
                }
                return;
            }

            let checked = 0;
            const total = toCheck.length;
            const foundCodes = new Set();

            for (const link of toCheck) {
                checkStatusCode(link, (status) => {
                    urlStatusCache.set(link, { status: status, checked: true });
                    if (status > 0) foundCodes.add(status);
                    checked++;
                    if (checked === total) {
                        isScanning = false;
                        checkStatusBtn.textContent = '🔄 Re-check';
                        checkStatusBtn.style.background = '#065f46';
                        checkStatusBtn.style.borderColor = '#10b981';
                        checkStatusBtn.style.color = '#5fd28a';
                        checkStatusBtn.disabled = false;
                        if (foundCodes.size > 0) {
                            buildStatusTags(foundCodes);
                            showToast(`✅ ${foundCodes.size} status codes found`);
                        } else {
                            showToast('⚠️ No status codes could be retrieved');
                        }
                        renderList(currentTab);
                    }
                });
            }
        }

        container.appendChild(statusBar);

        const searchBar = document.createElement('div');
        searchBar.style.cssText = 'display:flex;gap:10px;padding:4px 20px 10px 20px;background:#0a0a0f;border-bottom:1px solid #1a0f2e;align-items:center;flex-shrink:0;flex-wrap:wrap;';
        const searchSpan = document.createElement('span');
        searchSpan.style.cssText = 'font-size:12px;color:#8b5cf6;';
        searchSpan.textContent = '🔍 Search:';
        searchBar.appendChild(searchSpan);

        const searchInput = document.createElement('input');
        searchInput.id = 'search-input';
        searchInput.type = 'text';
        searchInput.placeholder = 'Type to filter URLs...';
        searchInput.style.cssText = 'background:#0f0a1a;border:1px solid #2d1b4e;color:#e6edf3;padding:3px 10px;border-radius:12px;font-size:12px;flex:1;min-width:150px;outline:none;';
        searchInput.addEventListener('input', () => renderList(currentTab));
        searchBar.appendChild(searchInput);

        const searchClearBtn = document.createElement('button');
        searchClearBtn.textContent = '✕';
        searchClearBtn.style.cssText = 'background:transparent;border:none;color:#6b7280;cursor:pointer;font-size:14px;padding:0 4px;';
        searchClearBtn.onclick = () => { searchInput.value = ''; renderList(currentTab); };
        searchBar.appendChild(searchClearBtn);

        container.appendChild(searchBar);

        const listContainer = document.createElement('div');
        listContainer.id = 'list-container';
        listContainer.style.cssText = 'padding:12px 20px 20px;overflow-y:auto;flex:1;background:#0a0a0f;scrollbar-width:thin;scrollbar-color:#6c2bd9 #0a0a0f;';
        listContainer.className = 'scrollable';

        const styleScroll = document.createElement('style');
        styleScroll.textContent = '#simon-tabs .scrollable::-webkit-scrollbar { width: 6px; } #simon-tabs .scrollable::-webkit-scrollbar-track { background: #0a0a0f; } #simon-tabs .scrollable::-webkit-scrollbar-thumb { background: #6c2bd9; border-radius: 10px; }';
        document.head.appendChild(styleScroll);
        container.appendChild(listContainer);

        function renderList(tabId) {
            const tab = tabData.find(t => t.id === tabId);
            let data = tab ? [...tab.data] : [];
            const color = tab ? tab.color : '#8b5cf6';
            const testValue = document.getElementById('test-value-input')?.value || '';
            currentTestValue = testValue;
            const searchText = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

            if (searchText) {
                data = data.filter(link => {
                    const full = getCompleteUrl(link);
                    return full.toLowerCase().includes(searchText) || link.toLowerCase().includes(searchText);
                });
            }

            if (statusFilterActive && (selectedStatusCodes.size > 0 || hiddenStatusCodes.size > 0)) {
                data = data.filter(link => {
                    const cached = urlStatusCache.get(link);
                    if (!cached) return true;
                    const status = cached.status;
                    if (selectedStatusCodes.size > 0 && selectedStatusCodes.has(status)) {
                        return true;
                    }
                    if (hiddenStatusCodes.size > 0 && hiddenStatusCodes.has(status)) {
                        return false;
                    }
                    if (selectedStatusCodes.size > 0 && !selectedStatusCodes.has(status)) {
                        return false;
                    }
                    return true;
                });
            }

            renderFilteredList(data, color, testValue, tabId);
        }

        function renderFilteredList(data, color, testValue, tabId) {
            const copyContainer = document.getElementById('copy-all-container');
            if (copyContainer) {
                copyContainer.innerHTML = '';
                const bulkBtn = document.createElement('button');
                const count = data.length;
                bulkBtn.textContent = `Copy All ${count}`;
                const colors = TAB_COLORS[tabId] || TAB_COLORS.all;
                bulkBtn.style.cssText = 'background:' + colors.bg + ';border:1px solid ' + colors.border + ';color:#fff;padding:3px 16px;border-radius:12px;font-size:12px;cursor:pointer;';
                if (count === 0) {
                    bulkBtn.style.opacity = '0.4';
                    bulkBtn.style.cursor = 'default';
                    bulkBtn.onclick = null;
                } else {
                    bulkBtn.onclick = () => {
                        const finalText = data.map(link => getCompleteUrl(link)).join('\n');
                        copyToClipboard(finalText, count);
                    };
                }
                copyContainer.appendChild(bulkBtn);
            }

            if (data.length === 0) {
                listContainer.innerHTML = '<div style="color:#4a3a6a;text-align:center;padding:40px 0;font-style:italic;">— no items found —</div>';
                return;
            }

            data.sort();

            const itemsDiv = document.createElement('div');
            for (const link of data) {
                let full = getCompleteUrl(link);
                let displayLink = full;
                let badge = '';
                let statusBadge = '';

                if (urlStatusCache.has(link)) {
                    const st = urlStatusCache.get(link).status;
                    if (st > 0) {
                        const color2 = getStatusColor(st);
                        statusBadge = `<span style="font-size:10px;color:${color2};background:#1a0f2e;padding:1px 6px;border-radius:8px;border:1px solid ${color2}33;margin-right:4px;">${st}</span>`;
                    } else {
                        statusBadge = `<span style="font-size:10px;color:#6b7280;background:#1a0f2e;padding:1px 6px;border-radius:8px;border:1px solid #2d1b4e;margin-right:4px;">N/A</span>`;
                    }
                }

                if (tabId === 'params' && link.includes('?') && testValue) {
                    try {
                        const urlObj = new URL(full);
                        const params = new URLSearchParams(urlObj.search);
                        for (const [key] of params) { params.set(key, testValue); }
                        urlObj.search = params.toString();
                        displayLink = urlObj.toString();
                        full = displayLink;
                    } catch {}
                }

                if (tabId === 'api') {
                    if (/\/graphql|\/gql/i.test(link)) badge = 'GraphQL';
                    else if (/\/rest|\/api\/v[0-9]/i.test(link)) badge = 'REST';
                    else if (/\/oauth|\/auth|\/login|\/logout/i.test(link)) badge = 'Auth';
                    else if (/\/user|\/users|\/profile|\/account/i.test(link)) badge = 'User';
                    else if (/\/order|\/orders|\/product|\/products|\/payment|\/payments|\/cart|\/checkout/i.test(link)) badge = 'Commerce';
                    else if (/\.(json|xml|yaml|yml)$/i.test(link)) badge = 'Data';
                    else badge = 'API';
                }

                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = 'padding:4px 0;border-bottom:1px solid #1a0f2e;font-size:12px;display:flex;align-items:center;gap:8px;';

                const linkEl = document.createElement('a');
                linkEl.href = full;
                linkEl.target = '_blank';
                linkEl.style.cssText = 'color:' + color + ';text-decoration:none;word-break:break-all;flex:1;font-size:12px;';
                linkEl.textContent = full;
                itemDiv.appendChild(linkEl);

                if (statusBadge) {
                    const span = document.createElement('span');
                    span.innerHTML = statusBadge;
                    itemDiv.appendChild(span);
                }

                if (badge) {
                    const badgeSpan = document.createElement('span');
                    badgeSpan.style.cssText = 'font-size:10px;color:#8b5cf6;background:#1a0f2e;padding:1px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;border:1px solid #2d1b4e;';
                    badgeSpan.textContent = badge;
                    itemDiv.appendChild(badgeSpan);
                }

                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Copy';
                copyBtn.style.cssText = 'background:#0f0a1a;border:1px solid #2d1b4e;color:#8b5cf6;padding:2px 10px;border-radius:12px;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0;';
                copyBtn.onclick = () => copyToClipboard(full);
                itemDiv.appendChild(copyBtn);

                itemsDiv.appendChild(itemDiv);
            }

            listContainer.innerHTML = '';
            listContainer.appendChild(itemsDiv);
        }

        applyBtn.addEventListener('click', () => {
            const val = document.getElementById('test-value-input')?.value || '';
            currentTestValue = val;
            renderList(currentTab);
            showToast(val ? `✅ Applied: "${val}"` : 'ℹ️ No value entered');
        });

        document.body.appendChild(container);
        renderList('all');
        isRunning = false;
        isReconOpen = true;
    }

    function autoStart(callback) {
        if (isRunning) {
            if (callback) callback();
            return;
        }
        isRunning = true;

        allUrls = new Set();
        paramUrls = new Set();
        fileUrls = new Set();
        specialUrls = new Set();
        apiUrls = new Set();
        originalParamValues = new Map();

        crawlPage(function() {
            isRunning = false;
            if (callback) callback();
        });
    }

    if (document.readyState === 'complete') {
        setTimeout(function() { autoStart(); }, 300);
    } else {
        window.addEventListener('load', function() {
            setTimeout(function() { autoStart(); }, 300);
        });
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'scanOnly') {
            if (allUrls.size === 0) {
                autoStart(function() {
                    sendResponse({ success: true });
                });
                return true;
            } else {
                sendResponse({ success: true });
                return true;
            }
        }

        if (request.action === 'runRecon') {
            const existing = document.getElementById('simon-tabs');
            if (existing) {
                existing.remove();
                isReconOpen = false;
                isRunning = false;
                sendResponse({ success: true });
                return true;
            }

            if (allUrls.size === 0) {
                autoStart(function() {
                    showReconWindow();
                    sendResponse({ success: true });
                });
                return true;
            }

            showReconWindow();
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'autoRecon') {
            autoStart(function() {
                sendResponse({ success: true });
            });
            return true;
        }

        if (request.action === 'getStats') {
            sendResponse(getStats());
            return true;
        }
    });

    console.log('🔍 Simon Recon loaded — auto-recon started');
})();