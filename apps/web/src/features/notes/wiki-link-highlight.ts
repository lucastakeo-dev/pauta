import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/** Mesmo padrão da extração no servidor, para a tela não prometer o que ele não faz. */
const WIKI_LINK = /\[\[([^[\]\n]+)\]\]/g

/**
 * Pinta os `[[links]]` no editor.
 *
 * Decoração, não marca de documento: o link é texto puro no conteúdo salvo — a verdade
 * é o texto, e o servidor extrai dele. Guardar uma marca no documento criaria uma
 * segunda fonte da verdade que poderia divergir do que está escrito.
 */
export const WikiLinkHighlight = Extension.create({
  name: 'wikiLinkHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikiLinkHighlight'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []

            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return

              for (const match of node.text.matchAll(WIKI_LINK)) {
                if (match.index === undefined) continue

                decorations.push(
                  Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                    class: 'wiki-link',
                  }),
                )
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
