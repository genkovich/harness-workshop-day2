import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { saveNote, searchNotes, maxNoteCharacters } from './notes.ts';

export function toolsForChat(chatId: string) {
  // chatId отримуємо від Telegram. Модель не задає його в аргументах.
  const save = defineTool({
    name: 'saveNote',
    description: 'Save a note for the current user when they ask to remember it.',
    input: v.object({
      text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(maxNoteCharacters)),
    }),
    run: ({ data }) => ({ output: saveNote(chatId, data.text) }),
  });

  const search = defineTool({
    name: 'searchNotes',
    description: "Find this user's saved notes containing the query text.",
    input: v.object({ query: v.string() }),
    run: ({ data }) => ({ output: searchNotes(chatId, data.query) }),
  });

  return [save, search];
}
