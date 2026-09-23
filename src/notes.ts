import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { canDeleteNotes } from './settings.ts';
import { randomUUID } from 'node:crypto';
import * as v from 'valibot';

export const maxNoteCharacters = 2_000;
const noteSchema = v.object({
  id: v.string(),
  chatId: v.string(),
  text: v.string(),
});
export type Note = v.InferOutput<typeof noteSchema>;

function notesFile() {
  return process.env.NOTES_FILE || 'notes.json';
}

export function readNotes(): Note[] {
  const file = notesFile();
  if (!existsSync(file)) {
    return [];
  }

  const text = readFileSync(file, 'utf8');
  const data: unknown = JSON.parse(text);
  return v.parse(v.array(noteSchema), data);
}

function writeNotes(notes: Note[]) {
  const file = notesFile();
  const temporaryFile = `${file}.tmp`;

  // Один навчальний процес: спершу повний файл, потім заміна.
  writeFileSync(temporaryFile, JSON.stringify(notes, null, 2), 'utf8');
  renameSync(temporaryFile, file);
}

export function saveNote(chatId: string, text: string) {
  const content = text.trim();
  if (!content || content.length > maxNoteCharacters) {
    throw new Error(`Нотатка має містити від 1 до ${maxNoteCharacters} символів.`);
  }

  const note = { id: randomUUID(), chatId, text: content };
  const notes = readNotes();
  notes.push(note);
  writeNotes(notes);
  return note;
}

export function searchNotes(chatId: string, query: string) {
  const searchText = query.toLowerCase();
  return readNotes().filter((note) => {
    const sameChat = note.chatId === chatId;
    const matches = note.text.toLowerCase().includes(searchText);
    return sameChat && matches;
  });
}

export function deleteNotes(chatId: string) {
  // Перевірка залишається тут, навіть якщо функцію викличуть без моделі.
  if (!canDeleteNotes(chatId)) {
    throw new Error('Видалення дозволене лише власнику.');
  }

  const notes = readNotes();
  const remaining = notes.filter((note) => note.chatId !== chatId);
  writeNotes(remaining);
  return { deleted: notes.length - remaining.length };
}
