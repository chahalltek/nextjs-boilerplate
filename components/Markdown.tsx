// components/Markdown.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        // Cast avoids a unified/vfile type mismatch across transitive deps
        remarkPlugins={[remarkGfm as unknown as any]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
