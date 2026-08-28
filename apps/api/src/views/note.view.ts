import type { NoteRef, NoteView } from '@pauta/contracts'
import type { NoteRecord, NoteRefRecord } from '../models/note.model.js'

/**
 * View da nota. `titleKey` existe na tabela mas **não sai na API** — é detalhe de
 * como o `[[link]]` resolve, não informação do cliente.
 */
function renderRef(ref: NoteRefRecord): NoteRef {
  return {
    id: ref.id,
    title: ref.title,
    dailyOn: ref.dailyOn ? ref.dailyOn.toISOString().slice(0, 10) : null,
  }
}

export function renderNote(note: NoteRecord): NoteView {
  return {
    id: note.id,
    title: note.title,
    contentJson: note.contentJson,
    dailyOn: note.dailyOn ? note.dailyOn.toISOString().slice(0, 10) : null,
    linksTo: note.linksTo.map(renderRef),
    linkedFrom: note.linkedFrom.map(renderRef),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

export function renderNoteRefs(refs: NoteRefRecord[]): NoteRef[] {
  return refs.map(renderRef)
}
