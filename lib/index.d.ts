export interface AuthenticationState {
  creds: Record<string, any>
  keys: Record<string, any>
}

export interface WASocketConfig {
  auth?: AuthenticationState
  pairingCode?: string
  showPairingPushNotification?: boolean
  version?: [number, number, number]
  browser?: any
  logger?: any
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  getMessage?: (key: any) => Promise<any>
  [key: string]: any
}

export interface WASocket {
  ev: any
  user?: any
  authState?: AuthenticationState
  readonly connectionState: 'connecting' | 'open' | 'close'
  readonly isConnected: boolean
  waitForConnection: (timeoutMs?: number) => Promise<void>
  onConnected: (handler: () => void) => () => void
  waitForConnectionUpdate: (predicate: (update: any) => boolean, timeoutMs?: number) => Promise<any>
  getConnectionHealth: () => {
    state: string
    connectedAt?: Date
    uptimeMs: number
    lastReceivedAt?: Date
    lastKeepAliveSent?: Date
    lastKeepAliveResponse?: Date
    keepAliveFailures: number
    lastDisconnect?: { at: Date; error?: any }
    reconnectable: boolean
    isReconnecting: boolean
  }
  sendAlbum: (jid: string, items: Array<{ image?: any; video?: any; [key: string]: any }>, options?: any) => Promise<{
    album: any
    messages: any[]
  }>
  createCallLink: (type: 'audio' | 'video', event?: { startTime: number }, timeoutMs?: number) => Promise<string | undefined>
  updateCallPrivacy: (value: 'all' | 'known') => Promise<void>
  requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>
  getLinkedDevices: () => Promise<any[]>
  sendMessage: (jid: string, content: any, options?: any) => Promise<any>
  sendReaction: (jid: string, key: any, text: string, options?: any) => Promise<any>
  removeReaction: (jid: string, key: any, options?: any) => Promise<any>
  sendPollVote: (jid: string, pollVote: any) => Promise<any>
  sendStatus: (content: any, recipientJids?: string[], options?: any) => Promise<any>
  downloadViewOnce: (message: any, type?: 'buffer' | 'stream' | string, options?: any) => Promise<any>
  updateMediaMessage: (message: any) => Promise<any>
  checkNumber: (phoneNumber: string | number) => Promise<{ jid: string; exists: boolean }>
  blockContact: (jid: string) => Promise<any>
  unblockContact: (jid: string) => Promise<any>
  pinChat: (jid: string, pin?: boolean) => Promise<any>
  fetchBlocklist: () => Promise<string[]>
  setPrivacy: (privacy: Record<string, any>) => Promise<any>
  getPrivacy: () => Promise<Record<string, any>>
  [key: string]: any
}

declare function makeWASocket(config: WASocketConfig): WASocket
export default makeWASocket
export { makeWASocket }

export declare function useMultiFileAuthState(folder: string): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}>

export declare function useSqliteAuthState(path: string): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
  close: () => Promise<void> | void
}>

export declare function normalizePairingCode(code: string): string
export declare function normalizePhoneNumber(phoneNumber: string): string
export declare function resolvePairingCode(config?: WASocketConfig, customPairingCode?: string): string
export declare function shouldShowPairingPushNotification(config?: WASocketConfig): boolean
export declare const DEFAULT_PAIRING_CODE: undefined
export declare const DEFAULT_CONNECTION_CONFIG: WASocketConfig
export declare const proto: any
export declare const WAProto: any
export declare const DisconnectReason: Record<string, number>
export declare const Browsers: any
export declare const makeInMemoryStore: (...args: any[]) => any
export declare const makeCacheableSignalKeyStore: (...args: any[]) => any
export declare const generateWAMessage: (...args: any[]) => Promise<any>
export declare const generateWAMessageContent: (...args: any[]) => Promise<any>
export declare const generateWAMessageFromContent: (...args: any[]) => Promise<any>
export declare const prepareWAMessageMedia: (...args: any[]) => Promise<any>
export declare const downloadMediaMessage: (...args: any[]) => Promise<any>
export declare const downloadViewOnceMessage: (message: any, type?: 'buffer' | 'stream' | string, options?: any, ctx?: any) => Promise<any>
export declare const encryptPollVote: (vote: { selectedOptions: Uint8Array[] }, context: {
  pollCreatorJid: string
  pollMsgId: string
  pollEncKey: Uint8Array
  voterJid: string
}) => { encPayload: Uint8Array; encIv: Uint8Array }
export declare const decryptPollVote: (...args: any[]) => any
export declare const getAggregateVotesInPollMessage: (...args: any[]) => Promise<any>
