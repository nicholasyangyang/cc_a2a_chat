import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Contact, ContactList } from './types.ts'

export function loadContacts(workdir: string): Contact[] {
  const path = join(workdir, 'contact.json')
  if (!existsSync(path)) return []
  const data = JSON.parse(readFileSync(path, 'utf-8')) as ContactList
  return data.contacts ?? []
}

export function addContact(workdir: string, npub: string, name: string): Contact[] {
  const contacts = loadContacts(workdir)
  if (contacts.some(c => c.npub === npub)) return contacts
  const updated = [...contacts, { npub, name }]
  writeFileSync(join(workdir, 'contact.json'), JSON.stringify({ contacts: updated }, null, 2))
  return updated
}

export function isAllowed(contacts: Contact[], npub: string): boolean {
  if (contacts.length === 0) return false
  return contacts.some(c => c.npub === npub)
}
