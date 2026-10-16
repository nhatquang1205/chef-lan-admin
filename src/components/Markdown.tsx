import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const STYLES = [
  'text-sm leading-relaxed',
  '[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold',
  '[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold',
  '[&_p]:my-2',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_a]:text-primary [&_a]:underline',
  '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse',
  '[&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium',
  '[&_td]:border [&_td]:px-3 [&_td]:py-1.5',
].join(' ')

export default function Markdown({ children }: { children: string }) {
  return (
    <div className={STYLES}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
