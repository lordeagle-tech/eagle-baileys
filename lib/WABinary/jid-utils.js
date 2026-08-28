export const S_WHATSAPP_NET = '@s.whatsapp.net';
export const OFFICIAL_BIZ_JID = '16505361212@c.us';
export const SERVER_JID = 'server@c.us';
export const PSA_WID = '0@c.us';
export const STORIES_JID = 'status@broadcast';
export const META_AI_JID = '13135550002@c.us';
export var WAJIDDomains;
(function (WAJIDDomains) {
  WAJIDDomains[WAJIDDomains["WHATSAPP"] = 0] = "WHATSAPP";
  WAJIDDomains[WAJIDDomains["LID"] = 1] = "LID";
  WAJIDDomains[WAJIDDomains["HOSTED"] = 128] = "HOSTED";
  WAJIDDomains[WAJIDDomains["HOSTED_LID"] = 129] = "HOSTED_LID";
})(WAJIDDomains || (WAJIDDomains = {}));
export const getServerFromDomainType = (initialServer, domainType) => {
  switch (domainType) {
    case WAJIDDomains.LID:
      return 'lid';
    case WAJIDDomains.HOSTED:
      return 'hosted';
    case WAJIDDomains.HOSTED_LID:
      return 'hosted.lid';
    case WAJIDDomains.WHATSAPP:
    default:
      return initialServer;
  }
};
export const jidEncode = (user, server, device, agent) => {
  return `${user || ''}${!!agent ? `_${agent}` : ''}${!!device ? `:${device}` : ''}@${server}`;
};
export const jidDecode = jid => {
  const sepIdx = typeof jid === 'string' ? jid.indexOf('@') : -1;
  if (sepIdx < 0) {
    return undefined;
  }
  const server = jid.slice(sepIdx + 1);
  const userCombined = jid.slice(0, sepIdx);
  const [userAgent, device] = userCombined.split(':');
  const [user, agent] = userAgent.split('_');
  let domainType = WAJIDDomains.WHATSAPP;
  if (server === 'lid') {
    domainType = WAJIDDomains.LID;
  } else if (server === 'hosted') {
    domainType = WAJIDDomains.HOSTED;
  } else if (server === 'hosted.lid') {
    domainType = WAJIDDomains.HOSTED_LID;
  } else if (agent) {
    domainType = parseInt(agent);
  }
  return {
    server: server,
    user: user,
    domainType,
    device: device ? +device : undefined
  };
};
export const areJidsSameUser = (jid1, jid2) => jidDecode(jid1)?.user === jidDecode(jid2)?.user;
export const isJidMetaAI = jid => jid?.endsWith('@bot');
export const isPnUser = jid => jid?.endsWith('@s.whatsapp.net');
export const isLidUser = jid => jid?.endsWith('@lid');
export const isJidBroadcast = jid => jid?.endsWith('@broadcast');
export const isJidGroup = jid => jid?.endsWith('@g.us');
export const isJidStatusBroadcast = jid => jid === 'status@broadcast';
export const isJidNewsletter = jid => jid?.endsWith('@newsletter');
export const isHostedPnUser = jid => jid?.endsWith('@hosted');
export const isHostedLidUser = jid => jid?.endsWith('@hosted.lid');
const botRegexp = /^1313555\d{4}$|^131655500\d{2}$/;
export const isJidBot = jid => jid && botRegexp.test(jid.split('@')[0]) && jid.endsWith('@c.us');
export const jidNormalizedUser = jid => {
  const result = jidDecode(jid);
  if (!result) {
    return '';
  }
  const {
    user,
    server
  } = result;
  return jidEncode(user, server === 'c.us' ? 's.whatsapp.net' : server);
};
const getAlias = (aliases, alias) => {
  const key = alias.trim().toLowerCase();
  if (aliases instanceof Map) {
    return aliases.get(key);
  }
  if (aliases && Object.prototype.hasOwnProperty.call(aliases, key)) {
    return aliases[key];
  }
  return undefined;
};
export const normalizePhoneNumber = phoneNumber => {
  if (typeof phoneNumber !== 'string' && typeof phoneNumber !== 'number') {
    throw new TypeError('Phone number must be a string or number');
  }
  const value = String(phoneNumber).trim().replace(/[()\s.-]/g, '');
  const digits = value.startsWith('+') ? value.slice(1) : value;
  if (!/^\d{5,15}$/.test(digits)) {
    throw new Error('Phone number must contain 5 to 15 digits, including the country code');
  }
  return digits;
};
export const normalizeJid = (value, aliases = {}) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new TypeError('JID, phone number, or alias must be a string or number');
  }
  let input = String(value).trim();
  const aliasedValue = typeof input === 'string' ? getAlias(aliases, input) : undefined;
  if (aliasedValue !== undefined) {
    input = aliasedValue;
  }
  if (typeof input !== 'string' && typeof input !== 'number') {
    throw new TypeError('JID alias must point to a JID or phone number');
  }
  input = String(input).trim();
  if (!input) {
    throw new Error('JID, phone number, or alias cannot be empty');
  }
  if (!input.includes('@')) {
    return jidEncode(normalizePhoneNumber(input), 's.whatsapp.net');
  }
  const decoded = jidDecode(input);
  if (!decoded?.user || !decoded.server) {
    throw new Error(`Invalid JID: ${input}`);
  }
  return jidEncode(decoded.user, decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server, decoded.device);
};
export const createJidResolver = (initialAliases = {}) => {
  const aliases = new Map();
  const initialEntries = initialAliases instanceof Map ? initialAliases.entries() : Object.entries(initialAliases || {});
  for (const [alias, value] of initialEntries) {
    if (typeof alias !== 'string' || !alias.trim()) {
      throw new Error('JID aliases must have non-empty names');
    }
    aliases.set(alias.trim().toLowerCase(), normalizeJid(value));
  }
  return {
    resolve: value => normalizeJid(value, aliases),
    setAlias: (alias, value) => {
      if (typeof alias !== 'string' || !alias.trim()) {
        throw new Error('JID alias must have a non-empty name');
      }
      const key = alias.trim().toLowerCase();
      const normalized = normalizeJid(value, aliases);
      aliases.set(key, normalized);
      return normalized;
    },
    removeAlias: alias => aliases.delete(String(alias).trim().toLowerCase()),
    getAliases: () => Object.fromEntries(aliases)
  };
};
export const transferDevice = (fromJid, toJid) => {
  const fromDecoded = jidDecode(fromJid);
  const deviceId = fromDecoded?.device || 0;
  const {
    server,
    user
  } = jidDecode(toJid);
  return jidEncode(user, server, deviceId);
};
