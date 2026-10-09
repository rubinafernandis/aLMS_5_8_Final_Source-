// Mock AI (Anthropic API shape) + mock Razorpay for the staging focus groups. Never touches real services.
import http from 'node:http';
http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    res.setHeader('content-type', 'application/json');
    if (url.pathname === '/v1/messages') {
      const j = JSON.parse(b); const u = JSON.stringify(j.messages[0].content);
      let text = 'Here is a short explanation from your course material.';
      if (j.system.includes('translator')) {
        const m = /<transcript>\\n([\s\S]*?)\\n<\/transcript>/.exec(u);
        text = (m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '').split('\n').map((p) => (!p.trim() ? p : p.replace(/^(\[[\d:]+\] )?/, '$1[HI] '))).join('\n');
      }
      return res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
    }
    // ---- PayPal stand-in. Its "approve" page is the LMS return address itself, so staging never leaves the site.
    if (url.pathname === '/v1/oauth2/token') return res.end(JSON.stringify({ access_token: 'stg', expires_in: 3600 }));
    if (url.pathname === '/v2/checkout/orders' && req.method === 'POST') {
      const j = JSON.parse(b); const id = 'STGPP' + Date.now(); const u = j.purchase_units[0];
      globalThis.pp = globalThis.pp || {}; globalThis.pp[id] = { v: u.amount.value, c: u.amount.currency_code, custom: u.custom_id };
      const ret = j.payment_source.paypal.experience_context.return_url.replace('?checkout=paypal', '?checkout=paypal&token=' + id + '&PayerID=STG');
      return res.end(JSON.stringify({ id, status: 'PAYER_ACTION_REQUIRED', links: [{ rel: 'payer-action', href: ret }] }));
    }
    const po = /^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/.exec(url.pathname);
    if (po) { const o = (globalThis.pp || {})[po[1]]; if (!o) { res.statusCode = 404; return res.end('{}'); }
      return res.end(JSON.stringify({ id: po[1], status: 'COMPLETED', purchase_units: [{ custom_id: o.custom, payments: { captures: [{ id: 'CAP' + po[1], status: 'COMPLETED', amount: { currency_code: o.c, value: o.v } }] } }] })); }
    if (url.pathname === '/v1/orders' && req.method === 'GET') return res.end(JSON.stringify({ items: [] }));
    if (url.pathname === '/v1/orders') { const j = JSON.parse(b); return res.end(JSON.stringify({ id: 'order_' + Date.now(), amount: j.amount, currency: j.currency })); }
    res.statusCode = 404; res.end('{}');
  });
}).listen(4795, '127.0.0.1');
