import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadContacts, addContact, isAllowed } from '../src/contacts.ts'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'cc_a2a_chat_'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true })
})

test('returns empty array when contact.json missing', () => {
  expect(loadContacts(tmpDir)).toEqual([])
})

test('loads contacts from contact.json', () => {
  writeFileSync(
    join(tmpDir, 'contact.json'),
    JSON.stringify({ contacts: [{ npub: 'npub1abc', name: 'Alice' }] })
  )
  expect(loadContacts(tmpDir)).toEqual([{ npub: 'npub1abc', name: 'Alice' }])
})

test('addContact writes to contact.json', () => {
  addContact(tmpDir, 'npub1abc', 'Alice')
  expect(loadContacts(tmpDir)).toEqual([{ npub: 'npub1abc', name: 'Alice' }])
})

test('addContact does not duplicate existing npub', () => {
  addContact(tmpDir, 'npub1abc', 'Alice')
  addContact(tmpDir, 'npub1abc', 'Alice2')
  expect(loadContacts(tmpDir)).toHaveLength(1)
})

test('isAllowed returns false for empty contact list', () => {
  expect(isAllowed([], 'npub1anything')).toBe(false)
})

test('isAllowed returns true for listed npub', () => {
  const contacts = [{ npub: 'npub1alice', name: 'Alice' }]
  expect(isAllowed(contacts, 'npub1alice')).toBe(true)
})

test('isAllowed returns false for unlisted npub', () => {
  const contacts = [{ npub: 'npub1alice', name: 'Alice' }]
  expect(isAllowed(contacts, 'npub1eve')).toBe(false)
})
