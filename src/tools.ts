import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { saveNote, searchNotes, maxNoteCharacters } from './notes.ts';

// chatId приходить від Telegram через код. Модель його не бачить і не може підмінити.

export function saveNoteTool(chatId: string) {
  return defineTool({
    name: 'saveNote',
    description: 'Save one note for the user when they ask to remember something.',
    input: v.object({
      text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(maxNoteCharacters)),
    }),
    run: ({ data }) => ({ output: saveNote(chatId, data.text) }),
  });
}

export function searchNotesTool(chatId: string) {
  return defineTool({
    name: 'searchNotes',
    description: "Find the user's saved notes that contain the query. An empty query returns all notes with their dates.",
    input: v.object({
      query: v.string(),
    }),
    run: ({ data }) => ({ output: searchNotes(chatId, data.query) }),
  });
}
