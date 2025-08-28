/**
 * 云同步（GitHub Gist）
 * 设计目标：最小改动、手动触发为主；默认远端覆盖本地/本地覆盖远端两种按钮
 */

(function () {
  const SYNC_STATE_KEY = 'simple_prompt_manager_sync_state';
  const SYNC_PAT_KEY = 'simple_prompt_manager_pat'; // 单独存放，避免出现在导出数据中
  const GIST_FILENAME = 'data.json';

  function readLocal(key, defaultValue = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : defaultValue;
    } catch (_) {
      return defaultValue;
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function getSyncState() {
    const state = readLocal(SYNC_STATE_KEY, {});
    return {
      gistId: state.gistId || '',
      lastETag: state.lastETag || '',
      lastSyncAt: state.lastSyncAt || 0,
      deviceId: state.deviceId || ensureDeviceId(state.deviceId),
      status: state.status || 'idle', // idle | syncing | error | ok
      lastError: state.lastError || '',
    };
  }

  function saveSyncState(patch) {
    const current = getSyncState();
    const next = { ...current, ...patch };
    writeLocal(SYNC_STATE_KEY, next);
    return next;
  }

  function getPat() {
    return readLocal(SYNC_PAT_KEY, '') || '';
  }

  function savePat(pat) {
    if (!pat) {
      localStorage.removeItem(SYNC_PAT_KEY);
      return true;
    }
    return writeLocal(SYNC_PAT_KEY, pat);
  }

  function ensureDeviceId(existing) {
    if (existing) return existing;
    const id = 'device_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const state = readLocal(SYNC_STATE_KEY, {}) || {};
    state.deviceId = id;
    writeLocal(SYNC_STATE_KEY, state);
    return id;
  }

  function nowTs() {
    return Date.now();
  }

  function buildPayload() {
    const state = getSyncState();
    const data = exportData();
    return {
      version: 1,
      updatedAt: nowTs(),
      deviceId: state.deviceId,
      data,
    };
  }

  async function createPrivateGist(pat) {
    const payload = buildPayload();
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: 'token ' + pat,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Simple Prompt Manager cloud sync',
        public: false,
        files: {
          [GIST_FILENAME]: { content: JSON.stringify(payload) },
        },
      }),
    });

    if (!res.ok) {
      const msg = await safeReadError(res);
      throw new Error('创建 Gist 失败: ' + msg);
    }
    const json = await res.json();
    const gistId = json.id;
    const etag = res.headers.get('ETag') || '';
    return { gistId, etag };
  }

  async function fetchRemote(pat, gistId, lastETag) {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'GET',
      headers: {
        Authorization: 'token ' + pat,
        Accept: 'application/vnd.github+json',
        ...(lastETag ? { 'If-None-Match': lastETag } : {}),
      },
    });

    if (res.status === 304) {
      return { status: 304, etag: lastETag };
    }

    if (res.status === 404) {
      throw new Error('找不到对应 Gist（404）');
    }

    if (!res.ok) {
      const msg = await safeReadError(res);
      throw new Error(`拉取失败: ${res.status} ${msg}`);
    }

    const json = await res.json();
    const file = json.files && json.files[GIST_FILENAME];
    if (!file) {
      throw new Error('Gist 中缺少 data.json');
    }

    // 优先使用 raw_url 读取完整内容
    let contentText = '';
    if (file.raw_url) {
      const rawRes = await fetch(file.raw_url, { headers: { Accept: 'application/vnd.github.raw' } });
      if (!rawRes.ok) {
        const msg = await rawRes.text().catch(() => '');
        throw new Error('读取 Gist 原始内容失败: ' + msg);
      }
      contentText = await rawRes.text();
    } else if (file.content) {
      contentText = file.content;
    } else {
      throw new Error('无法获取 Gist 文件内容');
    }

    const etag = res.headers.get('ETag') || '';
    const data = safeJsonParse(contentText, null);
    if (!data) throw new Error('远端数据解析失败');
    return { status: 200, etag, data };
  }

  async function updateRemote(pat, gistId, payload) {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'token ' + pat,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: { content: JSON.stringify(payload) },
        },
      }),
    });
    if (!res.ok) {
      const msg = await safeReadError(res);
      throw new Error('更新 Gist 失败: ' + msg);
    }
    const etag = res.headers.get('ETag') || '';
    return { etag };
  }

  async function safeReadError(res) {
    try {
      const t = await res.text();
      return t || res.statusText || '未知错误';
    } catch (_) {
      return res.statusText || '未知错误';
    }
  }

  async function pullOverrideLocal() {
    const pat = getPat();
    const { gistId, lastETag } = getSyncState();
    if (!pat || !gistId) throw new Error('请先配置 Token 与 Gist ID');

    saveSyncState({ status: 'syncing', lastError: '' });
    updateSyncStatusUI();

    const { status, etag, data } = await fetchRemote(pat, gistId, lastETag);
    if (status === 304) {
      saveSyncState({ status: 'ok', lastSyncAt: nowTs() });
      updateSyncStatusUI();
      showToast && showToast('已是最新');
      return { updated: false };
    }

    // 远端覆盖本地
    if (!data || !data.data) throw new Error('远端数据结构无效');
    const result = importData(data.data, false);
    if (!result || !result.success) {
      throw new Error(result && result.message ? result.message : '导入失败');
    }
    saveSyncState({ lastETag: etag || '', lastSyncAt: nowTs(), status: 'ok' });
    updateSyncStatusUI();
    return { updated: true };
  }

  async function pushOverrideRemote() {
    const pat = getPat();
    const { gistId } = getSyncState();
    if (!pat || !gistId) throw new Error('请先配置 Token 与 Gist ID');

    saveSyncState({ status: 'syncing', lastError: '' });
    updateSyncStatusUI();

    const payload = buildPayload();
    const { etag } = await updateRemote(pat, gistId, payload);
    saveSyncState({ lastETag: etag || '', lastSyncAt: nowTs(), status: 'ok' });
    updateSyncStatusUI();
    return { pushed: true };
  }

  async function validateBinding() {
    const pat = getPat();
    const { gistId, lastETag } = getSyncState();
    if (!pat || !gistId) throw new Error('请先配置 Token 与 Gist ID');
    const r = await fetchRemote(pat, gistId, lastETag || undefined).catch((e) => {
      throw e;
    });
    if (r.status === 200 || r.status === 304) return true;
    return false;
  }

  async function createAndBindGist() {
    const pat = getPat();
    if (!pat) throw new Error('请先填写 Token');
    const { gistId, etag } = await createPrivateGist(pat);
    saveSyncState({ gistId, lastETag: etag || '', status: 'ok', lastError: '' });
    updateSyncStatusUI();
    return { gistId };
  }

  function updateSyncStatusUI() {
    try {
      const { status, lastSyncAt } = getSyncState();
      const statusEl = document.getElementById('syncStatusText');
      const timeEl = document.getElementById('lastSyncTimeText');
      if (statusEl) statusEl.textContent = mapStatus(status);
      if (timeEl)
        timeEl.textContent = lastSyncAt
          ? typeof formatTime === 'function'
            ? formatTime(lastSyncAt)
            : new Date(lastSyncAt).toLocaleString()
          : '-';
    } catch (_) {}
  }

  function mapStatus(s) {
    switch (s) {
      case 'syncing':
        return '同步中…';
      case 'ok':
        return '已就绪';
      case 'error':
        return '错误';
      default:
        return '未配置';
    }
  }

  async function initOnLoad() {
    const pat = getPat();
    const { gistId } = getSyncState();
    if (!pat || !gistId) return; // 未配置，跳过
    try {
      await pullOverrideLocal();
      showToast && showToast('云端数据已同步', 'success');
    } catch (e) {
      saveSyncState({ status: 'error', lastError: String(e.message || e) });
      updateSyncStatusUI();
      // 静默失败即可
    }
  }

  function getConfig() {
    const s = getSyncState();
    return { pat: getPat(), gistId: s.gistId, lastSyncAt: s.lastSyncAt, status: s.status };
  }

  function setCredentials({ pat, gistId }) {
    if (typeof pat === 'string') savePat(pat.trim());
    if (typeof gistId === 'string') saveSyncState({ gistId: gistId.trim() });
    updateSyncStatusUI();
  }

  // 暴露到全局
  window.Sync = {
    getConfig,
    setCredentials,
    validateBinding,
    createAndBindGist,
    pullOverrideLocal,
    pushOverrideRemote,
    initOnLoad,
    updateSyncStatusUI,
  };
})();
