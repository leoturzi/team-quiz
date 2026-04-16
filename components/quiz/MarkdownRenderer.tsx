'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

const components: Components = {
  pre({ children }) {
    return <>{children}</>
  },
  code({ className, children }) {
    const codeString = String(children).replace(/\n$/, '')
    const langMatch = /language-(\w+)/.exec(className || '')

    if (langMatch || codeString.includes('\n')) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={langMatch?.[1] ?? 'text'}
          PreTag="div"
          customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
        >
          {codeString}
        </SyntaxHighlighter>
      )
    }

    return (
      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
        {children}
      </code>
    )
  },
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`max-w-none wrap-break-word text-foreground [&>*+*]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
