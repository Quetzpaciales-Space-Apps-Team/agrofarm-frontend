import { splitByGlossary, type GlossaryTerm as Term } from '../domain/glossary';
import { GlossaryTerm } from './GlossaryTerm';

/** Plain text where known glossary terms become tooltip triggers. */
export function GlossaryText({ text }: { text: string }) {
  return (
    <>
      {splitByGlossary(text).map((part, index) =>
        part.term ? (
          <GlossaryTerm key={index} term={part.term as Term} label={part.text} />
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
