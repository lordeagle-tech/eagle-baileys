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
  requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>
  getLinkedDevices: () => Promise<any[]>
  sendMessage: (jid: string, content: any, options?: any) => Promise<any>
  sendReaction: (jid: string, key: any, text: string, options?: any) => Promise<any>
  removeReaction: (jid: string, key: any, options?: any) => Promise<any>
  updateMediaMessage: (message: any) => Promise<any>
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
export declare const getAggregateVotesInPollMessage: (...args: any[]) => Promise<any>
