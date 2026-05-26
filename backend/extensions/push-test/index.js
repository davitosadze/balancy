const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Push Notification Tester</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 25px 50px rgba(0,0,0,.5);
    }
    h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; color: #f8fafc; }
    .subtitle { font-size: .85rem; color: #94a3b8; margin-bottom: 28px; }
    label { display: block; font-size: .81rem; font-weight: 600; color: #94a3b8;
            text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
    input, textarea, select {
      width: 100%; padding: 10px 14px;
      background: #0f172a; border: 1px solid #334155;
      border-radius: 8px; color: #e2e8f0; font-size: .95rem;
      outline: none; transition: border-color .15s;
    }
    input:focus, textarea:focus, select:focus { border-color: #6366f1; }
    textarea { resize: vertical; min-height: 80px; font-family: inherit; }
    .field { margin-bottom: 18px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .btn {
      width: 100%; padding: 12px;
      background: #6366f1; color: #fff;
      border: none; border-radius: 8px;
      font-size: 1rem; font-weight: 600;
      cursor: pointer; transition: background .15s, transform .1s;
      margin-top: 8px;
    }
    .btn:hover { background: #4f46e5; }
    .btn:active { transform: scale(0.98); }
    .btn:disabled { background: #334155; color: #64748b; cursor: not-allowed; transform: none; }
    .btn-secondary {
      background: #1e3a5f; border: 1px solid #3b82f6; color: #93c5fd;
      margin-bottom: 8px;
    }
    .btn-secondary:hover { background: #1d4ed8; color: #fff; }
    #result {
      margin-top: 20px; padding: 14px;
      border-radius: 8px; font-size: .88rem;
      font-family: ui-monospace, monospace;
      white-space: pre-wrap; word-break: break-all;
      display: none;
    }
    .result-ok  { background: #052e16; border: 1px solid #16a34a; color: #86efac; }
    .result-err { background: #2d0a0a; border: 1px solid #dc2626; color: #fca5a5; }
    .divider { border: none; border-top: 1px solid #334155; margin: 20px 0; }
    .token-list { max-height: 160px; overflow-y: auto; margin-top: 8px; }
    .token-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; background: #0f172a;
      border-radius: 6px; margin-bottom: 6px; cursor: pointer;
      border: 1px solid #1e293b; transition: border-color .15s;
    }
    .token-item:hover { border-color: #6366f1; }
    .token-item .name { font-weight: 600; font-size: .88rem; flex-shrink: 0; }
    .token-item .tok { font-size: .76rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tip { font-size: .78rem; color: #475569; margin-top: 6px; }
  </style>
</head>
<body>
<div class="card">
  <h1>🔔 Push Notification Tester</h1>
  <p class="subtitle">Send a test Expo push notification to a device</p>

  <div class="field">
    <label>Directus users with push token</label>
    <button class="btn btn-secondary" id="loadUsers" type="button">Load users from Directus</button>
    <div class="token-list" id="tokenList"></div>
    <p class="tip">Click a user to fill in their token</p>
  </div>

  <hr class="divider" />

  <div class="field">
    <label>Expo Push Token</label>
    <input id="token" type="text" placeholder="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" />
  </div>

  <div class="row">
    <div class="field">
      <label>Title</label>
      <input id="title" type="text" value="💰 LoansApp" />
    </div>
    <div class="field">
      <label>Sound</label>
      <select id="sound">
        <option value="default">Default</option>
        <option value="">None</option>
      </select>
    </div>
  </div>

  <div class="field">
    <label>Body</label>
    <textarea id="body" placeholder="Notification message…">This is a test notification from LoansApp admin 🚀</textarea>
  </div>

  <div class="field">
    <label>Extra data (JSON, optional)</label>
    <input id="data" type="text" placeholder='{"key": "value"}' />
  </div>

  <button class="btn" id="sendBtn" type="button">Send Notification</button>

  <div id="result"></div>
</div>

<script>
  async function loadUsers() {
    const btn = document.getElementById('loadUsers');
    const list = document.getElementById('tokenList');
    btn.disabled = true;
    btn.textContent = 'Loading…';
    try {
      const res = await fetch('/push-test/users');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load users');
      list.innerHTML = '';
      if (!json.length) {
        list.innerHTML = '<p style="font-size:.82rem;color:#64748b;padding:8px 0">No users with push tokens found. Open the app on your device first.</p>';
        return;
      }
      json.forEach(u => {
        const el = document.createElement('div');
        el.className = 'token-item';
        el.innerHTML = '<span class="name">' + (u.first_name || '') + ' ' + (u.last_name || u.email) + '</span><span class="tok">' + u.push_token + '</span>';
        el.onclick = () => { document.getElementById('token').value = u.push_token; };
        list.appendChild(el);
      });
    } catch (e) {
      list.innerHTML = '<p style="font-size:.82rem;color:#f87171;padding:8px 0">' + e.message + '</p>';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Load users from Directus';
    }
  }

  async function sendNotification() {
    const token = document.getElementById('token').value.trim();
    const title = document.getElementById('title').value.trim();
    const body  = document.getElementById('body').value.trim();
    const sound = document.getElementById('sound').value;
    const dataRaw = document.getElementById('data').value.trim();
    const result = document.getElementById('result');
    const btn = document.getElementById('sendBtn');

    result.style.display = 'none';

    if (!token) { alert('Please enter an Expo push token'); return; }
    if (!body)  { alert('Please enter a notification body'); return; }

    let data = {};
    if (dataRaw) {
      try { data = JSON.parse(dataRaw); }
      catch { alert('Extra data is not valid JSON'); return; }
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const payload = { to: token, title, body, sound: sound || undefined, data };
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      result.style.display = 'block';
      const ok = json?.data?.status === 'ok';
      result.className = ok ? 'result-ok' : 'result-err';
      result.textContent = JSON.stringify(json, null, 2);
    } catch (e) {
      result.style.display = 'block';
      result.className = 'result-err';
      result.textContent = 'Error: ' + e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Notification';
    }
  }

  document.getElementById('loadUsers').addEventListener('click', loadUsers);
  document.getElementById('sendBtn').addEventListener('click', sendNotification);
</script>
</body>
</html>`;

export default (router, { database }) => {
  // Serve the HTML tester UI
  router.get("/", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(HTML);
  });

  // Return users that have a push_token set
  router.get("/users", async (_req, res) => {
    try {
      const users = await database("directus_users")
        .select("id", "first_name", "last_name", "email", "push_token")
        .whereNotNull("push_token")
        .where("push_token", "!=", "");
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
