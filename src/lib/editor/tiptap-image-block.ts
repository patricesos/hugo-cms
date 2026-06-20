import TiptapImage from '@tiptap/extension-image';

/**
 * Extension Image avec sérialiseur Markdown qui ferme le bloc (closeBlock).
 * Contourne le bug de tiptap-markdown qui délègue au sérialiseur par défaut
 * de prosemirror-markdown (inline, pas de closeBlock), causant la perte
 * de la ligne vide de séparation entre deux images consécutives au
 * round-trip WYSIWYG → markdown.
 *
 * Voir : https://github.com/patricesos/hugo-cms/issues/...
 */
const ImageWithBlockMarkdown = TiptapImage.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const alt = state.esc(node.attrs.alt || '');
          const src = node.attrs.src.replace(/[()]/g, '\\$&');
          const title = node.attrs.title
            ? ` "${node.attrs.title.replace(/"/g, '\\"')}"`
            : '';
          state.write(`![${alt}](${src}${title})`);
          state.closeBlock(node);
        },
        parse: {
          // géré par markdown-it, inchangé
        },
      },
    };
  },
});

export default ImageWithBlockMarkdown;
