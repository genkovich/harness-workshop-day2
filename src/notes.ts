import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Звичайний код застосунку: про модель і Flue цей файл нічого не знає.
export type Note = {
  id: string;
  chatId: string;
  text: string;
  createdAt: string;
};

export const maxNoteCharacters = 2_000;

function notesFile() {
  // Тести підставляють тимчасовий файл через NOTES_FILE.
  return process.env.NOTES_FILE || 'notes.json';
}

export function readNotes(): Note[] {
  if (!existsSync(notesFile())) {
    return [];
  }
  return JSON.parse(readFileSync(notesFile(), 'utf8'));
}

function writeNotes(notes: Note[]) {
  writeFileSync(notesFile(), JSON.stringify(notes, null, 2), 'utf8');
}

export function saveNote(chatId: string, text: string) {
  const note = {
    id: randomUUID(),
    chatId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  writeNotes([...readNotes(), note]);
  return note;
}

export function searchNotes(chatId: string, query = '') {
  const search = query.trim().toLowerCase();
  // Спершу лише свій чат, потім пошук за текстом. Порожній запит повертає всі.
  return readNotes().filter((note) => {
    return note.chatId === chatId && note.text.toLowerCase().includes(search);
  });
}

export function deleteNotes(chatId: string) {
  const notes = readNotes();
  const remaining = notes.filter((note) => note.chatId !== chatId);
  writeNotes(remaining);
  return { deleted: notes.length - remaining.length };
}
