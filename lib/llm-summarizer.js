const http = require('http');
const https = require('https');
const { loadConfig } = require('./config');
const { redact, redactSession } = require('./redactor');

function summarizePattern(session) {
  return new Promise((resolve) => {
    const config = loadConfig();
    if (!config.llmEnabled || !config.llmEndpoint) {
      resolve(null);
      return;
    }

    const safe = redactSession(session || {});
    const tools = (safe.tools || []).map((t) => t.name).join(' → ') || '';
    const prompts = (safe.prompts || []).map((p) => p.text).join('\n') || '';
    const userContent = redact(`Summarize this workflow pattern in one sentence for a skill description:
Tools used: ${tools}
User prompts:
${prompts}
Respond with just the summary, no explanation.`);

    let parsed;
    try {
      parsed = new URL(config.llmEndpoint);
    } catch {
      resolve(null);
      return;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      resolve(null);
      return;
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const body = JSON.stringify({
      model: process.env.SKILL_WATCH_LLM_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 100,
      temperature: 0.3,
    });

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    if (process.env.SKILL_WATCH_LLM_API_KEY) {
      headers.Authorization = 'Bearer ' + process.env.SKILL_WATCH_LLM_API_KEY;
    }

    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers,
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices?.[0]?.message?.content || null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

module.exports = { summarizePattern };
