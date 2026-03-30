import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools'
import { nip19, nip44 } from 'nostr-tools'
import { Relay } from 'nostr-tools'
import { isAllowed } from './contacts.ts'
import { decodeNsec, decodeNpub } from './keys.ts'
import type { Contact, InboundMessage, RelayStatus } from './types.ts'

export interface NostrClientOptions {
  npub: string
  nsec: string
  relayUrls: string[]
  contacts: Contact[]
  onMessage: (msg: InboundMessage) => void
}

export class NostrClient {
  private privkey: Uint8Array
  private pubkeyHex: string
  private npub: string
  private relays: Map<string, { relay: Relay | null; connected: boolean }>
  private contacts: Contact[]
  private onMessage: (msg: InboundMessage) => void

  constructor(opts: NostrClientOptions) {
    this.privkey = decodeNsec(opts.nsec)
    this.pubkeyHex = decodeNpub(opts.npub)
    this.npub = opts.npub
    this.contacts = opts.contacts
    this.onMessage = opts.onMessage
    this.relays = new Map(opts.relayUrls.map(url => [url, { relay: null, connected: false }]))
  }

  async connect(): Promise<void> {
    await Promise.allSettled([...this.relays.keys()].map(url => this.connectRelay(url)))
  }

  private async connectRelay(url: string): Promise<void> {
    try {
      const relay = await Relay.connect(url)
      this.relays.set(url, { relay, connected: true })
      relay.subscribe([{ kinds: [1059], '#p': [this.pubkeyHex] }], {
        onevent: (event: any) => this.handleEvent(event),
      })
      relay.onclose = () => this.relays.set(url, { relay: null, connected: false })
    } catch {
      this.relays.set(url, { relay: null, connected: false })
    }
  }

  private handleEvent(event: any): void {
    try {
      const { senderNpub, content } = this.unwrapGiftWrap(event)
      if (!isAllowed(this.contacts, senderNpub)) return
      const contact = this.contacts.find(c => c.npub === senderNpub)
      this.onMessage({
        from_npub: senderNpub,
        from_name: contact?.name ?? null,
        content,
        received_at: new Date().toISOString(),
      })
    } catch (e) {
      process.stderr.write(`[cc_a2a_chat] handleEvent dropped event: ${e}\n`)
    }
  }

  async send(toNpub: string, content: string): Promise<{ ok: boolean; sent: number; total: number }> {
    const toPubkeyHex = decodeNpub(toNpub)
    const giftWrap = this.createGiftWrap(toPubkeyHex, content)
    const connected = [...this.relays.values()].filter(r => r.connected && r.relay)
    const results = await Promise.allSettled(connected.map(r => r.relay!.publish(giftWrap)))
    const sent = results.filter(r => r.status === 'fulfilled').length
    return { ok: sent > 0, sent, total: connected.length }
  }

  updateContacts(contacts: Contact[]): void {
    this.contacts = contacts
  }

  getRelayStatuses(): RelayStatus[] {
    return [...this.relays.entries()].map(([url, { connected }]) => ({ url, connected }))
  }

  // NIP-17: build gift wrap for recipient
  createGiftWrap(toPubkeyHex: string, content: string): any {
    // Layer 1: rumor (kind:14, unsigned)
    const rumor = {
      kind: 14,
      content,
      tags: [['p', toPubkeyHex]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.pubkeyHex,
    }
    // Layer 2: seal (kind:13, sender signs, NIP-44 encrypts rumor)
    const convKey1 = nip44.getConversationKey(this.privkey, toPubkeyHex)
    const seal = finalizeEvent(
      { kind: 13, content: nip44.encrypt(JSON.stringify(rumor), convKey1), tags: [], created_at: Math.floor(Date.now() / 1000) },
      this.privkey
    )
    // Layer 3: gift wrap (kind:1059, ephemeral key, NIP-44 encrypts seal)
    const ephemeralKey = generateSecretKey()
    const convKey2 = nip44.getConversationKey(ephemeralKey, toPubkeyHex)
    return finalizeEvent(
      { kind: 1059, content: nip44.encrypt(JSON.stringify(seal), convKey2), tags: [['p', toPubkeyHex]], created_at: Math.floor(Date.now() / 1000) },
      ephemeralKey
    )
  }

  // NIP-17: unwrap gift wrap received by this client
  unwrapGiftWrap(giftWrap: any): { senderNpub: string; content: string } {
    // Decrypt gift wrap → seal
    const convKey1 = nip44.getConversationKey(this.privkey, giftWrap.pubkey)
    const seal = JSON.parse(nip44.decrypt(giftWrap.content, convKey1))
    // Decrypt seal → rumor
    const convKey2 = nip44.getConversationKey(this.privkey, seal.pubkey)
    const rumor = JSON.parse(nip44.decrypt(seal.content, convKey2))
    return { senderNpub: nip19.npubEncode(rumor.pubkey), content: rumor.content }
  }
}
