export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/' && !url.searchParams.has('q')) {
      return new Response(HTML_PAGE, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    if (url.searchParams.has('q')) {
      const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      const query = url.searchParams.get('q');

      try {
        if (!env.SERPAPI_KEY) {
          return new Response(JSON.stringify({
            error: "SERPAPI_KEY saknas"
          }), { status: 500, headers: corsHeaders });
        }

        const serpUrl = `https://serpapi.com/search.json?engine=bing&q=${encodeURIComponent(query)}&api_key=${env.SERPAPI_KEY}&safe=off&hl=sv&num=50`;
        
        const response = await fetch(serpUrl);
        const data = await response.json();

        if (data.error) {
          return new Response(JSON.stringify({
            error: data.error
          }), { status: 400, headers: corsHeaders });
        }

        return new Response(JSON.stringify(data), { headers: corsHeaders });

      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message 
        }), { status: 500, headers: corsHeaders });
      }
    }

    // Proxy för webbsidor
    if (url.pathname === '/proxy' && url.searchParams.has('url')) {
      const targetUrl = url.searchParams.get('url');
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const contentType = response.headers.get('content-type') || 'text/html';
        
        // För HTML-innehåll, injicera skript för att hantera länkar
        if (contentType.includes('text/html')) {
          let html = await response.text();
          
          // Lägg till base tag för relativa URL:er
          const baseTag = `<base href="${targetUrl}">`;
          html = html.replace('<head>', `<head>${baseTag}`);
          
          // Injicera skript för att hantera länkklick
          const proxyScript = `
            <script>
              (function() {
                // Hantera alla länkklick
                document.addEventListener('click', function(e) {
                  const link = e.target.closest('a');
                  if (link && link.href) {
                    e.preventDefault();
                    const proxyUrl = '/proxy?url=' + encodeURIComponent(link.href);
                    window.location.href = proxyUrl;
                  }
                });
                
                // Hantera formulär
                document.addEventListener('submit', function(e) {
                  const form = e.target;
                  if (form.action) {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const params = new URLSearchParams(formData);
                    const proxyUrl = '/proxy?url=' + encodeURIComponent(form.action + '?' + params.toString());
                    window.location.href = proxyUrl;
                  }
                });
              })();
            <\/script>
          `;
          
          html = html.replace('</body>', `${proxyScript}</body>`);
          
          return new Response(html, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // För andra resurser, vidarebefordra direkt
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders
        });
        
      } catch (error) {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Fel</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>⚠️ Kunde inte ladda sidan</h1>
            <p>${error.message}</p>
            <p><a href="/" style="color: #ff3366;">← Tillbaka till Nusse Proxy</a></p>
          </body>
          </html>
        `, {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }
    
    return new Response(HTML_PAGE, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};

const HTML_PAGE = `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nusse Proxy</title>
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-tertiary: #1a1a25;
            --accent: #ff3366;
            --accent-hover: #ff5588;
            --accent-secondary: #00d4ff;
            --text-primary: #ffffff;
            --text-secondary: #a0a0b0;
            --text-tertiary: #606070;
            --border: rgba(255, 51, 102, 0.3);
            --glass: rgba(255, 255, 255, 0.03);
            --shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        [data-theme="light"] {
            --bg-primary: #f0f0f5;
            --bg-secondary: #ffffff;
            --bg-tertiary: #e8e8f0;
            --accent: #0066cc;
            --accent-hover: #0088ff;
            --accent-secondary: #00a0a0;
            --text-primary: #1a1a2e;
            --text-secondary: #505060;
            --text-tertiary: #808090;
            --border: rgba(0, 102, 204, 0.3);
            --glass: rgba(255, 255, 255, 0.7);
            --shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box;
        }
        
        body { 
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
            height: 100vh; 
            overflow: hidden;
            background: var(--bg-primary);
            color: var(--text-primary);
        }
        
        .app { 
            display: flex; 
            height: 100vh; 
        }
        
        .sidebar { 
            width: 420px;
            min-width: 420px;
            background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            border-right: 1px solid var(--border);
            display: flex; 
            flex-direction: column;
            box-shadow: var(--shadow);
        }
        
        .header {
            padding: 25px 20px;
            background: linear-gradient(135deg, rgba(255, 51, 102, 0.1) 0%, rgba(0, 212, 255, 0.05) 100%);
            border-bottom: 1px solid var(--border);
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 26px;
            font-weight: 800;
            background: linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .logo-icon {
            font-size: 32px;
            -webkit-text-fill-color: initial;
        }
        
        .subtitle {
            color: var(--text-secondary);
            font-size: 12px;
            margin-top: 6px;
            margin-left: 44px;
            letter-spacing: 0.5px;
        }
        
        .search-box { 
            padding: 20px; 
            border-bottom: 1px solid var(--border);
        }
        
        .search-wrapper {
            position: relative;
            display: flex;
            gap: 10px;
        }
        
        input { 
            flex: 1;
            padding: 14px 20px;
            background: var(--glass);
            border: 2px solid var(--border);
            border-radius: 30px; 
            color: var(--text-primary);
            font-size: 14px;
            outline: none;
            transition: all 0.3s ease;
        }
        
        input:focus {
            border-color: var(--accent);
            box-shadow: 0 0 20px rgba(255, 51, 102, 0.2);
        }
        
        input::placeholder { 
            color: var(--text-tertiary);
        }
        
        .search-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 51, 102, 0.3);
        }
        
        .search-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(255, 51, 102, 0.4);
        }

        .tabs {
            display: flex;
            padding: 0 20px;
            gap: 5px;
            border-bottom: 1px solid var(--border);
        }

        .tab {
            flex: 1;
            padding: 12px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s;
            border-bottom: 2px solid transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .tab:hover {
            color: var(--accent);
            background: rgba(255, 51, 102, 0.05);
        }

        .tab.active {
            color: var(--accent);
            border-bottom-color: var(--accent);
        }
        
        .results { 
            flex: 1; 
            overflow-y: auto; 
            padding: 15px;
            display: none;
        }

        .results.active {
            display: block;
        }
        
        .results::-webkit-scrollbar {
            width: 6px;
        }
        
        .results::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .results::-webkit-scrollbar-thumb {
            background: var(--accent);
            border-radius: 3px;
        }

        .results-header {
            padding: 10px 5px;
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 500;
            border-bottom: 1px solid var(--border);
            margin-bottom: 15px;
        }
        
        .result { 
            background: var(--glass);
            padding: 18px; 
            margin-bottom: 12px; 
            border-radius: 16px; 
            border: 1px solid transparent;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .result:hover { 
            background: rgba(255, 51, 102, 0.08);
            border-color: var(--border);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }
        
        .result-title { 
            color: var(--accent-secondary); 
            font-weight: 700; 
            margin-bottom: 8px;
            font-size: 15px;
            line-height: 1.3;
        }
        
        .result-url { 
            color: var(--accent); 
            font-size: 11px; 
            margin-bottom: 10px;
            word-break: break-all;
            opacity: 0.8;
        }
        
        .result-snippet { 
            color: var(--text-secondary); 
            font-size: 13px; 
            line-height: 1.5;
            margin-bottom: 15px;
        }

        .result-actions {
            display: flex;
            gap: 10px;
        }

        .btn-action {
            flex: 1;
            padding: 10px 16px;
            border-radius: 10px;
            border: none;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn-open {
            background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(255, 51, 102, 0.3);
        }

        .btn-open:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 51, 102, 0.4);
        }

        .btn-newtab {
            background: var(--glass);
            color: var(--text-primary);
            border: 1px solid var(--border);
        }

        .btn-newtab:hover {
            background: rgba(0, 212, 255, 0.1);
            border-color: var(--accent-secondary);
            color: var(--accent-secondary);
        }
        
        .loading, .error, .empty {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary);
        }

        .empty-icon {
            font-size: 50px;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        
        .main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
        }

        .tab-bar {
            display: flex;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
            overflow-x: auto;
            padding: 8px 10px 0;
            gap: 5px;
        }

        .tab-bar::-webkit-scrollbar {
            height: 4px;
        }

        .browser-tab {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background: var(--glass);
            border-radius: 12px 12px 0 0;
            cursor: pointer;
            min-width: 140px;
            max-width: 200px;
            position: relative;
            transition: all 0.3s;
            border: 1px solid transparent;
            border-bottom: none;
        }

        .browser-tab:hover {
            background: rgba(255, 51, 102, 0.1);
        }

        .browser-tab.active {
            background: var(--bg-primary);
            border-color: var(--border);
            border-top: 2px solid var(--accent);
        }

        .browser-tab.new-tab {
            min-width: 40px;
            max-width: 40px;
            justify-content: center;
            background: transparent;
            border: 2px dashed var(--border);
            border-radius: 12px;
            margin-left: 5px;
        }

        .browser-tab.new-tab:hover {
            background: rgba(255, 51, 102, 0.1);
            border-color: var(--accent);
        }

        .tab-title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
            font-weight: 500;
        }

        .tab-close {
            background: none;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 16px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }

        .tab-close:hover {
            background: var(--accent);
            color: white;
        }
        
        .toolbar {
            height: 60px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            padding: 0 20px;
            gap: 12px;
        }
        
        .nav-btn {
            background: var(--glass);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 10px 16px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .nav-btn:hover:not(:disabled) {
            background: rgba(255, 51, 102, 0.1);
            border-color: var(--accent);
            color: var(--accent);
        }

        .nav-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
        
        .address-bar {
            flex: 1;
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 20px;
            color: var(--text-primary);
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .address-bar .icon {
            color: var(--accent-secondary);
        }

        .url-text {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--text-secondary);
        }

        .btn-newtab-toolbar {
            background: linear-gradient(135deg, var(--accent-secondary) 0%, #00a0a0 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
        }

        .btn-newtab-toolbar:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
        }
        
        .viewer { 
            flex: 1;
            position: relative;
            background: var(--bg-primary);
            overflow: hidden;
        }

        .tab-content {
            display: none;
            width: 100%;
            height: 100%;
            position: relative;
        }

        .tab-content.active {
            display: block;
        }
        
        iframe { 
            width: 100%; 
            height: 100%; 
            border: none;
            background: white;
        }
        
        .welcome {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: var(--text-tertiary);
            pointer-events: none;
        }
        
        .welcome-icon {
            font-size: 100px;
            margin-bottom: 20px;
            opacity: 0.3;
        }
        
        .welcome h2 {
            color: var(--text-secondary);
            font-weight: 300;
            font-size: 18px;
        }

        .loading-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: var(--text-secondary);
            display: none;
        }

        .loading-indicator.active {
            display: block;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .settings-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 10px;
            transition: all 0.3s;
        }

        .settings-btn:hover {
            background: var(--glass);
            color: var(--accent);
        }

        .settings-panel {
            position: absolute;
            top: 80px;
            right: 20px;
            width: 280px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 25px;
            box-shadow: var(--shadow);
            display: none;
            z-index: 1000;
        }

        .settings-panel.active {
            display: block;
        }

        .settings-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 25px;
            color: var(--accent);
        }

        .setting-item {
            margin-bottom: 20px;
        }

        .setting-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--text-primary);
            font-size: 14px;
        }

        .toggle {
            width: 50px;
            height: 26px;
            background: var(--glass);
            border-radius: 13px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s;
            border: 1px solid var(--border);
        }

        .toggle.active {
            background: var(--accent);
        }

        .toggle::after {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: all 0.3s;
        }

        .toggle.active::after {
            left: 26px;
        }

        .btn-danger {
            width: 100%;
            padding: 12px;
            background: transparent;
            color: var(--accent);
            border: 1px solid var(--accent);
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            margin-top: 10px;
            transition: all 0.3s;
        }

        .btn-danger:hover {
            background: var(--accent);
            color: white;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: none;
            z-index: 999;
        }

        .overlay.active {
            display: block;
        }

        .error-page {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            text-align: center;
        }

        .error-page h2 {
            color: var(--accent);
            margin-bottom: 15px;
        }

        .error-page p {
            color: var(--text-secondary);
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="app">
        <div class="sidebar">
            <div class="header">
                <div class="logo">
                    <span class="logo-icon">🚀</span>
                    <span>Nusse Proxy</span>
                </div>
                <div class="subtitle">Snabb & Säker Surfning</div>
            </div>
            
            <div class="search-box">
                <div class="search-wrapper">
                    <input type="text" id="query" placeholder="Sök på webben...">
                    <button class="search-btn" id="searchBtn">🔍</button>
                </div>
            </div>

            <div class="tabs">
                <button class="tab active" id="tab-search">🔍 Sök</button>
                <button class="tab" id="tab-bookmarks">⭐ Bokmärken</button>
                <button class="tab" id="tab-history">🕐 Historik</button>
            </div>
            
            <div class="results active" id="results-search">
                <div class="empty">
                    <div class="empty-icon">🔎</div>
                    <div>Börja söka på webben</div>
                </div>
            </div>

            <div class="results" id="results-bookmarks">
                <div class="empty">
                    <div class="empty-icon">⭐</div>
                    <div>Inga bokmärken ännu</div>
                </div>
            </div>

            <div class="results" id="results-history">
                <div class="empty">
                    <div class="empty-icon">🕐</div>
                    <div>Ingen historik ännu</div>
                </div>
            </div>
        </div>

        <div class="main">
            <div class="tab-bar" id="tabBar">
                <div class="browser-tab new-tab" id="newTabBtn">+</div>
            </div>

            <div class="toolbar">
                <button class="nav-btn" id="btn-back" disabled>←</button>
                <button class="nav-btn" id="btn-forward" disabled>→</button>
                <button class="nav-btn" id="btn-reload">↻</button>
                
                <div class="address-bar">
                    <span class="icon">🔒</span>
                    <span class="url-text" id="addressBar">Ny flik</span>
                </div>

                <button class="btn-newtab-toolbar" id="btn-open-newtab">↗️ Ny flik</button>
                <button class="settings-btn" id="btn-settings">⚙️</button>
            </div>
            
            <div class="viewer" id="viewer">
            </div>
        </div>

        <div class="overlay" id="overlay"></div>
        <div class="settings-panel" id="settings-panel">
            <div class="settings-title">⚙️ Inställningar</div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <span>🌓 Mörkt Tema</span>
                    <div class="toggle" id="themeToggle"></div>
                </div>
            </div>

            <button class="btn-danger" id="btn-clear-data">🗑️ Rensa all data</button>
            <button class="btn-danger" id="btn-close-settings" style="border-color: var(--text-tertiary); color: var(--text-secondary);">Stäng</button>
        </div>
    </div>

    <script>
        // Globala variabler
        let results = [];
        let bookmarks = [];
        let history = [];
        let tabs = [];
        let activeTabId = null;
        let tabCounter = 0;
        let darkMode = true;

        // Initialisering
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, initializing...');
            
            // Ladda data från localStorage
            try {
                bookmarks = JSON.parse(localStorage.getItem('nusse_bookmarks') || '[]');
                history = JSON.parse(localStorage.getItem('nusse_history') || '[]');
            } catch (e) {
                console.error('Error loading localStorage:', e);
                bookmarks = [];
                history = [];
            }
            
            // Sätt upp event listeners
            setupEventListeners();
            
            // Skapa första fliken
            newTab();
            
            // Uppdatera UI
            updateBookmarks();
            updateHistory();
        });

        function setupEventListeners() {
            // Sök
            document.getElementById('searchBtn').addEventListener('click', search);
            document.getElementById('query').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') search();
            });
            
            // Flikar
            document.getElementById('tab-search').addEventListener('click', function() { switchTab('search'); });
            document.getElementById('tab-bookmarks').addEventListener('click', function() { switchTab('bookmarks'); });
            document.getElementById('tab-history').addEventListener('click', function() { switchTab('history'); });
            
            // Ny flik
            document.getElementById('newTabBtn').addEventListener('click', newTab);
            
            // Navigation
            document.getElementById('btn-back').addEventListener('click', goBack);
            document.getElementById('btn-forward').addEventListener('click', goForward);
            document.getElementById('btn-reload').addEventListener('click', reload);
            
            // Öppna i ny flik
            document.getElementById('btn-open-newtab').addEventListener('click', openInNewTab);
            
            // Inställningar
            document.getElementById('btn-settings').addEventListener('click', toggleSettings);
            document.getElementById('overlay').addEventListener('click', toggleSettings);
            document.getElementById('btn-close-settings').addEventListener('click', toggleSettings);
            document.getElementById('themeToggle').addEventListener('click', toggleTheme);
            document.getElementById('btn-clear-data').addEventListener('click', clearData);
        }

        function search() {
            const q = document.getElementById('query').value.trim();
            if (!q) return;
            
            switchTab('search');
            const div = document.getElementById('results-search');
            div.innerHTML = '<div class="loading">Söker...</div>';
            
            fetch('/?q=' + encodeURIComponent(q))
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        div.innerHTML = '<div class="error">' + escape(data.error) + '</div>';
                        return;
                    }
                    results = data.organic_results || [];
                    showResults();
                    addToHistory(q, 'search');
                })
                .catch(e => {
                    div.innerHTML = '<div class="error">Fel: ' + escape(e.message) + '</div>';
                });
        }

        function showResults() {
            const div = document.getElementById('results-search');
            
            if (results.length === 0) {
                div.innerHTML = '<div class="empty"><div class="empty-icon">😕</div>Inga resultat hittades</div>';
                return;
            }
            
            let html = '<div class="results-header">Visar ' + results.length + ' resultat</div>';
            
            html += results.map((r, i) => {
                return '<div class="result">' +
                    '<div class="result-title">' + escape(r.title) + '</div>' +
                    '<div class="result-url">' + escape(r.displayed_url || r.link) + '</div>' +
                    '<div class="result-snippet">' + escape(r.snippet || '') + '</div>' +
                    '<div class="result-actions">' +
                        '<button class="btn-action btn-open" data-index="' + i + '">📂 Öppna här</button>' +
                        '<button class="btn-action btn-newtab" data-index="' + i + '">↗️ Ny flik</button>' +
                    '</div>' +
                '</div>';
            }).join('');
            
            div.innerHTML = html;
            
            // Sätt upp event listeners för resultatknappar
            div.querySelectorAll('.btn-open').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openSite(parseInt(this.dataset.index));
                });
            });
            
            div.querySelectorAll('.btn-newtab').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openResultInNewTab(parseInt(this.dataset.index));
                });
            });
        }

        function openSite(index) {
            const site = results[index];
            if (!site || !activeTabId) return;
            
            const tab = tabs.find(t => t.id === activeTabId);
            if (!tab) return;
            
            tab.title = site.title.substring(0, 25);
            tab.url = site.link;
            tab.history.push(site.link);
            tab.historyIndex = tab.history.length - 1;
            
            updateTabUI(tab);
            
            // Använd proxy för att ladda sidan
            const proxyUrl = '/proxy?url=' + encodeURIComponent(site.link);
            loadIframe(tab.id, proxyUrl);
            
            addToHistory(site.title, 'visit');
        }

        function loadIframe(tabId, url) {
            const contentDiv = document.getElementById('tab-content-' + tabId);
            if (!contentDiv) return;
            
            // Visa laddningsindikator
            contentDiv.innerHTML = 
                '<div class="loading-indicator active" id="loading-' + tabId + '">' +
                    '<div class="spinner"></div>' +
                    '<div>Laddar...</div>' +
                '</div>' +
                '<iframe id="iframe-' + tabId + '" src="' + url + '" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation" loading="eager"></iframe>';
            
            // Dölj laddningsindikator när iframe laddats
            const iframe = document.getElementById('iframe-' + tabId);
            const loading = document.getElementById('loading-' + tabId);
            
            iframe.onload = function() {
                if (loading) loading.style.display = 'none';
            };
            
            iframe.onerror = function() {
                if (loading) loading.innerHTML = '<div class="error-page"><h2>⚠️ Kunde inte ladda sidan</h2><p>Det kan bero på säkerhetsbegränsningar</p></div>';
            };
        }

        function openResultInNewTab(index) {
            window.open(results[index].link, '_blank');
        }

        function openInNewTab() {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab && tab.url) window.open(tab.url, '_blank');
        }

        function newTab() {
            tabCounter++;
            const tabId = 'tab-' + tabCounter;
            
            tabs.push({
                id: tabId,
                title: 'Ny flik',
                url: '',
                history: [],
                historyIndex: -1
            });
            
            const tabEl = document.createElement('div');
            tabEl.className = 'browser-tab';
            tabEl.id = 'tab-el-' + tabId;
            tabEl.innerHTML = '<span class="tab-title" id="tab-title-' + tabId + '">Ny flik</span><button class="tab-close" data-tabid="' + tabId + '">×</button>';
            
            // Klick på fliken för att växla
            tabEl.addEventListener('click', function(e) {
                if (!e.target.classList.contains('tab-close')) {
                    switchToTab(tabId);
                }
            });
            
            // Klick på stäng-knappen
            tabEl.querySelector('.tab-close').addEventListener('click', function(e) {
                e.stopPropagation();
                closeTab(tabId);
            });
            
            const tabBar = document.getElementById('tabBar');
            tabBar.insertBefore(tabEl, tabBar.lastElementChild);
            
            const content = document.createElement('div');
            content.className = 'tab-content';
            content.id = 'tab-content-' + tabId;
            content.innerHTML = 
                '<div class="welcome">' +
                    '<div class="welcome-icon">🌐</div>' +
                    '<h2>Välj ett sökresultat för att börja surfa</h2>' +
                '</div>';
            document.getElementById('viewer').appendChild(content);
            
            switchToTab(tabId);
        }

        function switchToTab(tabId) {
            document.querySelectorAll('.browser-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const tabEl = document.getElementById('tab-el-' + tabId);
            const contentEl = document.getElementById('tab-content-' + tabId);
            
            if (tabEl) tabEl.classList.add('active');
            if (contentEl) contentEl.classList.add('active');
            
            activeTabId = tabId;
            const tab = tabs.find(t => t.id === tabId);
            if (tab) {
                document.getElementById('addressBar').textContent = tab.url || 'Ny flik';
                updateNavButtons();
            }
        }

        function closeTab(tabId) {
            const idx = tabs.findIndex(t => t.id === tabId);
            if (idx === -1) return;
            
            tabs.splice(idx, 1);
            
            const tabEl = document.getElementById('tab-el-' + tabId);
            const contentEl = document.getElementById('tab-content-' + tabId);
            
            if (tabEl) tabEl.remove();
            if (contentEl) contentEl.remove();
            
            if (activeTabId === tabId) {
                if (tabs.length > 0) {
                    switchToTab(tabs[Math.max(0, idx - 1)].id);
                } else {
                    newTab();
                }
            }
        }

        function updateTabUI(tab) {
            const titleEl = document.getElementById('tab-title-' + tab.id);
            if (titleEl) titleEl.textContent = tab.title;
            document.getElementById('addressBar').textContent = tab.url;
            updateNavButtons();
        }

        function goBack() {
            const tab = tabs.find(t => t.id === activeTabId);
            if (!tab || tab.historyIndex <= 0) return;
            
            tab.historyIndex--;
            const url = tab.history[tab.historyIndex];
            tab.url = url;
            updateTabUI(tab);
            
            const proxyUrl = '/proxy?url=' + encodeURIComponent(url);
            loadIframe(tab.id, proxyUrl);
        }

        function goForward() {
            const tab = tabs.find(t => t.id === activeTabId);
            if (!tab || tab.historyIndex >= tab.history.length - 1) return;
            
            tab.historyIndex++;
            const url = tab.history[tab.historyIndex];
            tab.url = url;
            updateTabUI(tab);
            
            const proxyUrl = '/proxy?url=' + encodeURIComponent(url);
            loadIframe(tab.id, proxyUrl);
        }

        function reload() {
            const tab = tabs.find(t => t.id === activeTabId);
            if (!tab || !tab.url) return;
            
            const proxyUrl = '/proxy?url=' + encodeURIComponent(tab.url);
            loadIframe(tab.id, proxyUrl);
        }

        function updateNavButtons() {
            const tab = tabs.find(t => t.id === activeTabId);
            document.getElementById('btn-back').disabled = !tab || tab.historyIndex <= 0;
            document.getElementById('btn-forward').disabled = !tab || tab.historyIndex >= tab.history.length - 1;
        }

        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.add('active');
            document.querySelectorAll('.results').forEach(r => r.classList.remove('active'));
            document.getElementById('results-' + tab).classList.add('active');
        }

        function updateBookmarks() {
            const div = document.getElementById('results-bookmarks');
            const empty = div.querySelector('.empty');
            
            if (bookmarks.length === 0) {
                if (empty) empty.style.display = 'block';
                div.innerHTML = '';
                if (empty) div.appendChild(empty);
                return;
            }
            
            if (empty) empty.style.display = 'none';
            div.innerHTML = bookmarks.map((b, i) => 
                '<div class="result bookmark-item" data-index="' + i + '">' +
                    '<div class="result-title">⭐ ' + escape(b.title) + '</div>' +
                    '<div class="result-url">' + escape(b.url) + '</div>' +
                '</div>'
            ).join('');
            
            // Sätt upp event listeners för bokmärken
            div.querySelectorAll('.bookmark-item').forEach(item => {
                item.addEventListener('click', function() {
                    openBookmark(parseInt(this.dataset.index));
                });
            });
        }

        function openBookmark(index) {
            const b = bookmarks[index];
            if (!b) return;
            
            if (!activeTabId) newTab();
            const tab = tabs.find(t => t.id === activeTabId);
            if (!tab) return;
            
            tab.title = b.title.substring(0, 25);
            tab.url = b.url;
            tab.history.push(b.url);
            tab.historyIndex = tab.history.length - 1;
            
            updateTabUI(tab);
            
            const proxyUrl = '/proxy?url=' + encodeURIComponent(b.url);
            loadIframe(tab.id, proxyUrl);
        }

        function addToHistory(title, type) {
            history.unshift({ title: title, type: type, time: new Date().toLocaleString('sv-SE') });
            if (history.length > 50) history = history.slice(0, 50);
            try {
                localStorage.setItem('nusse_history', JSON.stringify(history));
            } catch (e) {
                console.error('Error saving history:', e);
            }
            updateHistory();
        }

        function updateHistory() {
            const div = document.getElementById('results-history');
            const empty = div.querySelector('.empty');
            
            if (history.length === 0) {
                if (empty) empty.style.display = 'block';
                div.innerHTML = '';
                if (empty) div.appendChild(empty);
                return;
            }
            
            if (empty) empty.style.display = 'none';
            div.innerHTML = history.map(h => 
                '<div class="result">' +
                    '<div class="result-title">' + (h.type === 'search' ? '🔍' : '🌐') + ' ' + escape(h.title) + '</div>' +
                    '<div class="result-url">' + h.time + '</div>' +
                '</div>'
            ).join('');
        }

        function toggleSettings() {
            document.getElementById('settings-panel').classList.toggle('active');
            document.getElementById('overlay').classList.toggle('active');
        }

        function toggleTheme() {
            darkMode = !darkMode;
            document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
            document.getElementById('themeToggle').classList.toggle('active', !darkMode);
        }

        function clearData() {
            if (confirm('Radera all data?')) {
                try {
                    localStorage.clear();
                } catch (e) {
                    console.error('Error clearing localStorage:', e);
                }
                location.reload();
            }
        }

        function escape(text) {
            if (!text) return '';
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    </script>
</body>
</html>`;
