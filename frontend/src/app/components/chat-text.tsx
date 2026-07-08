import { Fragment, type ReactNode } from 'react';

// JourZy's replies use a small, self-imposed markdown subset (bullet lines
// starting with "- ", and **bold** for key values) — not a general markdown
// library, since we fully control the model's output format via the system
// prompt and only need these two constructs rendered properly instead of
// showing up as literal "-"/"**" characters.
function renderInlineBold(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(p => p !== '');
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${keyPrefix}-b-${i}`}>{part.slice(2, -2)}</strong>
      : <Fragment key={`${keyPrefix}-t-${i}`}>{part}</Fragment>
  );
}

export function ChatText({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let paraBuffer: string[] = [];

  const flushPara = (key: string) => {
    if (paraBuffer.length === 0) return;
    blocks.push(
      <p key={key} className="m-0 whitespace-pre-wrap">
        {renderInlineBold(paraBuffer.join('\n'), key)}
      </p>
    );
    paraBuffer = [];
  };
  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 space-y-1 my-2">
        {bulletBuffer.map((item, i) => (
          <li key={i}>{renderInlineBold(item, `${key}-${i}`)}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, idx) => {
    const bulletMatch = line.trim().match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      flushPara(`p-${idx}`);
      bulletBuffer.push(bulletMatch[1]);
    } else {
      flushBullets(`ul-${idx}`);
      paraBuffer.push(line);
    }
  });
  flushPara('p-end');
  flushBullets('ul-end');

  return <>{blocks}</>;
}
