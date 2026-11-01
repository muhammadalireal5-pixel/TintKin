export function maskEmail(email) {
  const value = String(email ?? '');
  const at = value.indexOf('@');
  if (at < 1) return value ? '•••' : '';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';
  return `${local[0]}•••@${host[0] ?? ''}•••${tld}`;
}

export function initialOf(name) {
  const first = String(name ?? '').trim()[0];
  return first ? `${first.toUpperCase()}.` : '';
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const URL_RE = /https?:\/\/\S+/gi;

export function redactText(text) {
  return String(text ?? '')
    .replace(EMAIL_RE, '[email]')
    .replace(URL_RE, '[link]')
    .replace(PHONE_RE, '[number]');
}
