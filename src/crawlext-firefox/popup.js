(function() {
    'use strict';

    const refreshBtn = document.getElementById('refreshBtn');
    const reconBtn = document.getElementById('reconBtn');
    const statusEl = document.getElementById('status');

    const statTotal   = document.getElementById('statTotal');
    const statParams  = document.getElementById('statParams');
    const statAPI     = document.getElementById('statAPI');
    const statFiles   = document.getElementById('statFiles');
    const statSpecial = document.getElementById('statSpecial');

    let hasStats = false;
    let isReconning = false;
    let scanned = false;

    function setStats(stats) {
        const allEls = [
            { el: statTotal, cls: 'stat-number' },
            { el: statParams, cls: 'num-params' },
            { el: statAPI, cls: 'num-api' },
            { el: statFiles, cls: 'num-files' },
            { el: statSpecial, cls: 'num-special' }
        ];

        if (stats && stats.total !== undefined && stats.total > 0) {
            statTotal.textContent   = stats.total   || 0;
            statParams.textContent  = stats.params  || 0;
            statAPI.textContent     = stats.api     || 0;
            statFiles.textContent   = stats.files   || 0;
            statSpecial.textContent = stats.special || 0;

            allEls.forEach(({ el, cls }) => {
                el.className = 'stat-half-num ' + cls;
            });
            statTotal.className = 'stat-full-num';
            hasStats = true;
        } else {
            statTotal.textContent   = '?';
            statParams.textContent  = '?';
            statAPI.textContent     = '?';
            statFiles.textContent   = '?';
            statSpecial.textContent = '?';

            allEls.forEach(({ el }) => {
                el.className = 'stat-half-num loading';
            });
            statTotal.className = 'stat-full-num loading';
            hasStats = false;
        }
    }

    function getStats(callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (!tabs || !tabs[0]) return callback(null);
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getStats' }, function(response) {
                if (chrome.runtime.lastError) return callback(null);
                callback(response);
            });
        });
    }

    function getCurrentTab(callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs.length > 0) callback(tabs[0]);
        });
    }

    function updateReconButton(state) {
        const icon = document.querySelector('#reconBtn .btn-icon');
        const label = document.querySelector('#reconBtn .btn-label');
        const arrow = document.querySelector('#reconBtn .btn-arrow');

        if (state === 'loading') {
            reconBtn.disabled = true;
            if (icon) icon.textContent = '⏳';
            if (label) label.textContent = 'Scanning...';
            if (arrow) arrow.textContent = '';
            statusEl.textContent = '⏳ Scanning for links...';
            statusEl.className = 'status loading';
        } else if (state === 'ready') {
            reconBtn.disabled = false;
            if (icon) icon.textContent = '📊';
            if (label) label.textContent = 'View Panel';
            if (arrow) arrow.textContent = '›';
            statusEl.textContent = '✅ Recon complete';
            statusEl.className = 'status done';
            setTimeout(() => {
                statusEl.textContent = '✦ Ready ✦';
                statusEl.className = 'status';
            }, 1500);
        } else {
            reconBtn.disabled = false;
            if (icon) icon.textContent = '🔍';
            if (label) label.textContent = 'Recon';
            if (arrow) arrow.textContent = '›';
            statusEl.textContent = '✦ Ready ✦';
            statusEl.className = 'status';
        }
    }

    refreshBtn.addEventListener('click', function() {
        const btn = this;
        btn.disabled = true;
        statusEl.textContent = '⏳ Reloading...';
        statusEl.className = 'status loading';

        hasStats = false;
        isReconning = false;
        scanned = false;
        setStats(null);
        updateReconButton('initial');

        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> Reloading...`;

        getCurrentTab(function(tab) {
            chrome.tabs.reload(tab.id, {}, function() {
                const listener = function(updatedTabId, changeInfo) {
                    if (updatedTabId === tab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                        statusEl.textContent = '✅ Page reloaded';
                        statusEl.className = 'status done';

                        hasStats = false;
                        scanned = false;
                        setStats(null);
                        updateReconButton('initial');

                        setTimeout(() => {
                            if (statusEl.textContent === '✅ Page reloaded') {
                                statusEl.textContent = '✦ Ready ✦';
                                statusEl.className = 'status';
                            }
                        }, 1500);
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);

                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    if (btn.disabled) {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                        statusEl.textContent = '⚠️ Timeout';
                        statusEl.className = 'status error';
                    }
                }, 15000);
            });
        });
    });

    // ── RECON BUTTON ──
    reconBtn.addEventListener('click', function() {
        // ── اگر قبلاً اسکن شده و آماری داریم ──
        if (scanned && hasStats && !isReconning) {
            statusEl.textContent = '📊 Opening panel...';
            statusEl.className = 'status loading';
            getCurrentTab(function(tab) {
                chrome.tabs.sendMessage(tab.id, { action: 'runRecon' }, function(response) {
                    if (chrome.runtime.lastError || !response) {
                        statusEl.textContent = '⚠️ Reload page first';
                        statusEl.className = 'status error';
                        return;
                    }
                    statusEl.textContent = '✅ Panel opened';
                    statusEl.className = 'status done';
                    setTimeout(() => {
                        statusEl.textContent = '✦ Ready ✦';
                        statusEl.className = 'status';
                    }, 1200);
                });
            });
            return;
        }

        if (isReconning) return;

        isReconning = true;
        scanned = true;
        updateReconButton('loading');

        getCurrentTab(function(tab) {
            chrome.tabs.sendMessage(tab.id, { action: 'scanOnly' }, function(response) {
                if (chrome.runtime.lastError || !response) {
                    isReconning = false;
                    scanned = false;
                    statusEl.textContent = '⚠️ Reload page first';
                    statusEl.className = 'status error';
                    updateReconButton('initial');
                    return;
                }

                let attempts = 0;
                const maxAttempts = 40;
                const pollInterval = setInterval(function() {
                    attempts++;
                    getStats(function(stats) {
                        if (stats && stats.total > 0) {
                            clearInterval(pollInterval);
                            setStats(stats);
                            hasStats = true;
                            isReconning = false;
                            updateReconButton('ready');
                            return;
                        }

                        if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            isReconning = false;
                            scanned = false;
                            setStats(null);
                            statusEl.textContent = '⚠️ No links found';
                            statusEl.className = 'status error';
                            updateReconButton('initial');
                        }
                    });
                }, 500);
            });
        });
    });

    setInterval(function() {
        if (hasStats && !isReconning && scanned) {
            getStats(function(stats) {
                if (stats && stats.total > 0) {
                    setStats(stats);
                }
            });
        }
    }, 3000);

    document.addEventListener('DOMContentLoaded', function() {
        hasStats = false;
        isReconning = false;
        scanned = false;
        setStats(null);
        updateReconButton('initial');

        getStats(function(stats) {
            if (stats && stats.total > 0) {
                setStats(stats);
                hasStats = true;
            }
        });
    });

})();