import sanitizeHtml from 'sanitize-html'

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  'img',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'mark',
  'figure',
  'figcaption',
  'video',
  'source',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
])

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ['href', 'name', 'target', 'rel', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
  video: ['src', 'controls', 'autoplay', 'loop', 'muted', 'playsinline', 'poster', 'width', 'height'],
  source: ['src', 'type'],
  code: ['class'],
  pre: ['class'],
  span: ['class'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
}

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html || '', {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
      video: ['http', 'https'],
      source: ['http', 'https'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
      }, true),
      img: sanitizeHtml.simpleTransform('img', {
        loading: 'lazy',
        decoding: 'async',
      }, true),
    },
  })
}
