// Визуальный HTML-редактор Jodit для описаний, страниц и новостей.
import 'jodit/es2021/jodit.min.css';
import { Jodit } from 'jodit/esm/index.js';
import 'jodit/esm/plugins/all.js';
import ru from 'jodit/esm/langs/ru.js';

// В ESM-сборке словари языков регистрируются в Jodit.lang (README пакета упоминает устаревшее Jodit.langs)
(Jodit as unknown as { lang: Record<string, unknown> }).lang.ru = ru;

export function initEditors(): void {
  document.querySelectorAll<HTMLTextAreaElement>('textarea[data-editor]').forEach((textarea) => {
    Jodit.make(textarea, {
      language: 'ru',
      height: Number(textarea.dataset.height) || 420,
      toolbarAdaptive: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: 'insert_clear_html',
      buttons: [
        'source', '|', 'paragraph', 'bold', 'italic', 'underline', 'strikethrough', '|',
        'ul', 'ol', '|', 'align', 'outdent', 'indent', '|',
        'image', 'table', 'link', 'hr', '|', 'brush', 'eraser', '|', 'undo', 'redo', 'fullsize',
      ],
      uploader: {
        url: '/admin/upload',
        insertImageAsBase64URI: false,
        format: 'json',
      },
      filebrowser: undefined,
    } as Parameters<typeof Jodit.make>[1]);
  });
}
