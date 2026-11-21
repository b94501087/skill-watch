const path = require('path');

const PATTERNS = [
  { name: 'absolute_path', regex: /\/(?:home|Users|var|tmp|opt|workspace)\/[^\s"'`]+/g, replacement: '<PATH>' },
  { name: 'windows_path', regex: /[A-Z]:\\[^\s"'`]+/g, replacement: '<PATH>' },
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '<EMAIL>' },
  { name: 'api_key', regex: /(?:sk|pk|api|key|token|secret|password|auth)[_-]?[a-zA-Z0-9_-]{16,}/gi, replacement: '<KEY>' },
  { name: 'bearer', regex: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer <TOKEN>' },
  { name: 'basic_auth', regex: /Basic\s+[a-zA-Z0-9+/=]+/gi, replacement: 'Basic <CREDENTIALS>' },
  { name: 'aws_key', regex: /AKIA[0-9A-Z]{16}/g, replacement: '<AWS_KEY>' },
  { name: 'github_token', regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g, replacement: '<GITHUB_TOKEN>' },
  { name: 'uuid', regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: '<UUID>' },
  { name: 'ip_address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '<IP>' },
  { name: 'account_id', regex: /(?:account|user|org)[_-]?(?:id)?[:\s]*[a-zA-Z0-9]{8,}/gi, replacement: '<ACCOUNT>' },
];

function redact(text) {
  if (!text || typeof text !== 'string') return text;

  let result = text;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern.regex, pattern.replacement);
  }
  return result;
}

function redactSession(session) {
  return {
    prompts: session.prompts?.map(p => ({
      ...p,
      text: redact(p.text)
    })) || [],
    tools: session.tools?.map(t => ({
      ...t,
      input: redact(t.input)
    })) || [],
    startTime: session.startTime
  };
}

module.exports = { redact, redactSession, PATTERNS };
