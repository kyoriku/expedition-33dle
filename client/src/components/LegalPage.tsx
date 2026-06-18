import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "./Header";

// Brand typography overrides for the rendered markdown elements.
const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-gold mt-4 mb-4 font-serif text-3xl font-extrabold md:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-parchment mt-8 mb-2 font-serif text-xl font-bold md:text-2xl">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="text-parchment my-3 text-sm leading-relaxed md:text-base">
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-gold decoration-gold/40 hover:text-gold-bright underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="text-parchment my-3 list-disc space-y-1 pl-5">{children}</ul>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  hr: () => <div className="rule my-8" aria-hidden="true" />,
  em: ({ children }) => <em className="italic">{children}</em>,
};

interface LegalPageProps {
  source: string;
}

export default function LegalPage({ source }: LegalPageProps) {
  return (
    <main className="flex-1 py-8 md:py-12">
      {/* Header spans the same width as the homepage header. */}
      <div className="mx-auto w-full max-w-xl px-4 md:max-w-3xl md:px-6 lg:max-w-6xl">
        <Header brandAs="div" />
      </div>
      {/* Body stays at a comfortable reading width. */}
      <div className="mx-auto w-full max-w-[752px] px-4">
        <Link
          to="/"
          className="text-gold decoration-gold/40 hover:text-gold-bright mt-6 mb-6 inline-block text-sm underline underline-offset-2"
        >
          ← Back to game
        </Link>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {source}
        </ReactMarkdown>
      </div>
    </main>
  );
}
