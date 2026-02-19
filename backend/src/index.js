import http from 'http';
import crypto from 'crypto';

const PORT = 8787;
const XFYUN_APP_ID = '1aebbbfc';
const XFYUN_SECRET_KEY = 'c133421dfd3a38f8e4e8814aeb91fba4';
const DEEPSEEK_API_KEY = 'sk-ad142ca83f4a4954b18eb90b637dce0f';
const ALLOW_ORIGIN = '*';

function stripHtml(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}
function extractCdataOrText(s) {
  if (!s || typeof s !== 'string') return '';
  const cdata = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) return cdata[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  return stripHtml(s);
}
function formatDuration(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) {
    const sec = parseInt(s, 10);
    const min = Math.floor(sec / 60) || 0;
    return min ? min + ' 分钟' : '0 分钟';
  }
  const parts = s.split(':').map(Number).filter((n) => !isNaN(n));
  if (parts.length === 0) return null;
  const [h = 0, m = 0, sec = 0] = parts.length === 1 ? [0, 0, parts[0]] : parts.length === 2 ? [0, parts[0], parts[1]] : parts;
  const totalMin = Math.floor(h * 60 + m + sec / 60) || 0;
  return totalMin + ' 分钟';
}
function resolveUrl(base, relative) {
  if (!relative) return relative;
  if (relative.startsWith('http://') || relative.startsWith('https://')) return relative;
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}
function parseRssXml(text, feedUrl = '') {
  const showNameMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const showName = showNameMatch ? extractCdataOrText(showNameMatch[1]) : '播客节目';
  const feedImgMatch = text.match(/<itunes:image[^>]+href=["']([^"']+)["']/i) || text.match(/<image[^>]*>[\s\S]*?<url[^>]*>([^<]+)<\/url>/i);
  const feedImage = feedImgMatch ? (feedImgMatch[1] || '').trim() : null;
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const episodes = [];
  let idx = 0;
  let m;
  while ((m = itemRegex.exec(text)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const itunesTitleMatch = block.match(/<itunes:title[^>]*>([\s\S]*?)<\/itunes:title>/i);
    let title = (titleMatch ? extractCdataOrText(titleMatch[1]) : '') || (itunesTitleMatch ? extractCdataOrText(itunesTitleMatch[1]) : '') || `Episode ${idx + 1}`;
    const pubMatch = block.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i) || block.match(/<dc:date[^>]*>([^<]+)</i);
    const encMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i) || block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const durMatch = block.match(/<itunes:duration[^>]*>([^<]+)<\/itunes:duration>/i);
    const itemImgMatch = block.match(/<itunes:image[^>]+href=["']([^"']+)["']/i) || block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    const descMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i) || block.match(/<itunes:summary[^>]*>([\s\S]*?)<\/itunes:summary>/i);
    const pubDate = pubMatch ? pubMatch[1].trim() : '';
    let audioUrl = encMatch ? encMatch[1].trim() : null;
    if (audioUrl && feedUrl) audioUrl = resolveUrl(feedUrl, audioUrl);
    const durationRaw = durMatch ? durMatch[1].trim() : null;
    const duration = formatDuration(durationRaw) || (durationRaw ? String(durationRaw) : null);
    const coverImage = itemImgMatch ? itemImgMatch[1].trim() : feedImage;
    const rawDesc = descMatch ? descMatch[1] : '';
    let contentSnippet = rawDesc ? (extractCdataOrText(rawDesc) || stripHtml(rawDesc)) : '';
    contentSnippet = contentSnippet.replace(/\]\]\s*>/g, '').slice(0, 2000);
    episodes.push({ index: idx, title, pubDate, audioUrl, duration: duration || null, coverImageUrl: coverImage || null, contentSnippet: contentSnippet || null });
    idx++;
  }
  return { showName, episodes };
}

function xfyunSigna(appId, ts, secretKey) {
  const baseString = appId + ts;
  const md5 = crypto.createHash('md5').update(baseString).digest('hex');
  const signa = crypto.createHmac('sha1', secretKey).update(md5).digest('base64');
  return encodeURIComponent(signa);
}

function parseXfyunResult(orderResult) {
  try {
    const obj = typeof orderResult === 'string' ? JSON.parse(orderResult) : orderResult;
    const lattice = obj.lattice2 || obj.lattice || [];
    const lines = [];
    for (const item of lattice) {
      const bg = parseInt(item.begin || item.bg || '0', 10);
      let j = item.json_1best;
      if (typeof j === 'string') {
        try { j = JSON.parse(j); } catch { continue; }
      }
      const st = j?.st || j;
      const rl = (st && st.rl) || item.rl || '1';
      const speaker = 'Speaker' + Math.max(1, parseInt(String(rl), 10));
      const m = Math.floor(bg / 60000);
      const s = Math.floor((bg % 60000) / 1000);
      const tsStr = `${m}:${s.toString().padStart(2, '0')}`;
      let text = '';
      if (st && st.rt) {
        for (const r of st.rt) {
          for (const w of r.ws || []) {
            for (const c of w.cw || []) {
              if (c.w) text += c.w;
            }
          }
        }
      }
      if (text.trim()) lines.push(`[${tsStr}] ${speaker}: ${text.trim()}`);
    }
    return lines.join('\n');
  } catch (e) {
    return '';
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if ((url.pathname === '/rss/preview' || url.pathname === '/api/rss/preview') && (req.method === 'GET' || req.method === 'POST')) {
    let rssUrl = url.searchParams.get('url');
    if (!rssUrl && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      try {
        const data = JSON.parse(body || '{}');
        rssUrl = data.rssUrl || data.url || null;
      } catch (_) {}
    }
    if (!rssUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }
    try {
      const resp = await fetch(rssUrl, { headers: { 'User-Agent': 'WhisperEcho/1.0' } });
      if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
      const xml = await resp.text();
      const data = parseRssXml(xml, rssUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message || 'Failed to fetch RSS' }));
    }
    return;
  }

  if ((url.pathname === '/ask' || url.pathname === '/api/ask') && req.method === 'POST') {
    let body = '';
    try { for await (const chunk of req) body += chunk; } catch (e) { console.error('[ask] read body:', e.message); }
    try {
      let data = {};
      try { data = JSON.parse(body || '{}'); } catch (_) { console.error('[ask] JSON parse failed'); }
      const history = data.history || [];
      const userMessage = String(data.userMessage || '').trim();
      const transcriptSummary = String(data.transcriptSummary || '').slice(0, 8000);
      if (!userMessage) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'userMessage 不能为空' }));
        return;
      }
      const messages = [
        { role: 'system', content: `你是一个播客内容助手。请根据用户提供的节目内容回答问题。

回答格式要求（必须遵守）：
1. 分点回答，每条前加数字序号，如：1. xxx  2. xxx  3. xxx
2. 多要点时用数字列表，结构清晰
3. 段落之间空一行
4. 不要使用 * ** # 等 markdown 符号
5. 使用简洁清晰的中文
6. 先概括再展开，或先列要点再补充说明

参考内容（可能是逐字稿或概览）：\n${transcriptSummary}` },
        ...history.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: String(m.text || '') })),
        { role: 'user', content: userMessage },
      ];
      const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
        }),
      });
      const errBody = await dsRes.text();
      if (!dsRes.ok) {
        let errMsg = errBody || 'DeepSeek API 请求失败';
        try { const j = JSON.parse(errBody); errMsg = j.error?.message || j.error?.code || errMsg; } catch (_) {}
        console.error('[ask] DeepSeek error:', dsRes.status, errMsg);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errMsg }));
        return;
      }
      const dsData = JSON.parse(errBody);
      let text = dsData?.choices?.[0]?.message?.content || '抱歉，未能获取回复。';
      text = String(text).replace(/\*{1,3}/g, '').replace(/^#+\s*/gm, '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text }));
    } catch (e) {
      const errMsg = e.cause?.message || e.message || '对话服务出错';
      console.error('[ask] exception:', errMsg, e.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: errMsg }));
    }
    return;
  }

  if ((url.pathname === '/transcribe' || url.pathname === '/api/transcribe') && req.method === 'POST') {
    let body = '';
    try { for await (const chunk of req) body += chunk; } catch (e) { console.error('[transcribe] read body:', e?.message); }
    try {
      const data = typeof body === 'string' && body.trim() ? JSON.parse(body) : {};
      const audioUrl = data.audioUrl;
      console.log('[transcribe] audioUrl:', audioUrl?.slice(0, 80));
      if (!audioUrl || !audioUrl.startsWith('http')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid audioUrl' }));
        return;
      }
      const ts = Math.floor(Date.now() / 1000).toString();
      const signa = xfyunSigna(XFYUN_APP_ID, ts, XFYUN_SECRET_KEY);
      const fileName = 'audio.mp3';
      const uploadUrl = `https://raasr.xfyun.cn/v2/api/upload?appId=${XFYUN_APP_ID}&ts=${ts}&signa=${signa}&fileName=${encodeURIComponent(fileName)}&fileSize=0&duration=60&language=cn&audioMode=urlLink&audioUrl=${encodeURIComponent(audioUrl)}&roleType=1&roleNum=2`;
      const uploadRes = await fetch(uploadUrl, { method: 'POST' });
      const uploadData = await uploadRes.json();
      if (uploadData.code !== '000000') {
        const msg = uploadData.descInfo || uploadData.code || '讯飞上传失败';
        if (msg.includes('语种未授权') || msg.includes('26607') || msg.includes('vcn auth fail')) {
          throw new Error('讯飞转写语种未授权(26607)。请登录 console.xfyun.cn，在应用中开通「语音转写」服务，并在「方言/语种」中启用中文。');
        }
        if (msg.includes('26625') || msg.includes('26633')) {
          throw new Error('讯飞转写服务时长不足，请到产品页领取或购买时长。');
        }
        throw new Error(msg);
      }
      const orderId = uploadData.content?.orderId;
      if (!orderId) throw new Error('未返回订单ID');
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const ts2 = Math.floor(Date.now() / 1000).toString();
        const signa2 = xfyunSigna(XFYUN_APP_ID, ts2, XFYUN_SECRET_KEY);
        const getUrl = `https://raasr.xfyun.cn/v2/api/getResult?appId=${XFYUN_APP_ID}&ts=${ts2}&signa=${signa2}&orderId=${orderId}`;
        const getRes = await fetch(getUrl, { method: 'POST' });
        const getData = await getRes.json();
        if (getData.code !== '000000') continue;
        const status = getData.content?.orderInfo?.status;
        if (status === 4) {
          const transcript = parseXfyunResult(getData.content?.orderResult || '');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ transcript }));
          return;
        }
        if (status === -1) throw new Error('讯飞转写失败');
      }
      throw new Error('转写超时，请稍后重试');
    } catch (e) {
      const msg = (e && typeof e.message === 'string' ? e.message : String(e)) || '转写失败';
      console.error('[transcribe] error:', msg);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: msg }));
      }
    }
    return;
  }

  if ((url.pathname === '/rss/import' || url.pathname === '/api/rss/import') && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let rssUrl = url.searchParams.get('url');
    if (!rssUrl) {
      try {
        const data = JSON.parse(body || '{}');
        rssUrl = data.rssUrl || data.url || null;
      } catch (_) {}
    }
    if (!rssUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Import not implemented yet' }));
    return;
  }

  if ((url.pathname === '/audio-proxy' || url.pathname === '/api/audio-proxy') && req.method === 'GET') {
    const raw = decodeURIComponent(String(url.searchParams.get('url') || ''));
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid audio URL' }));
      return;
    }
    try {
      const rangeHeader = req.headers.range;
      const headers = { 'User-Agent': 'WhisperEcho/1.0' };
      if (rangeHeader) headers['Range'] = rangeHeader;
      const upstream = await fetch(raw, { headers });
      if (!upstream.ok && upstream.status !== 206) throw new Error('Upstream error ' + upstream.status);
      const ct = upstream.headers.get('content-type') || 'audio/mpeg';
      const contentLength = upstream.headers.get('content-length');
      const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
      res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
      res.setHeader('Accept-Ranges', acceptRanges);
      if (upstream.status === 206) {
        res.setHeader('Content-Range', upstream.headers.get('content-range') || '');
        res.writeHead(206, { 'Content-Type': ct, 'Content-Length': contentLength || '' });
      } else {
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.writeHead(200, { 'Content-Type': ct });
      }
      const buf = await upstream.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (e) {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Audio fetch failed' }));
      }
    }
    return;
  }

  if ((url.pathname === '/podcasts' || url.pathname === '/api/podcasts') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }

  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'whisper-echo-backend' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: url.pathname }));
});

server.listen(PORT, () => console.log(`Backend http://localhost:${PORT}`));
