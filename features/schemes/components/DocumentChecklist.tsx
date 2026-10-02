import React from 'react';

export interface DocumentChecklistProps {
  documents: string[];
  emptyLabel: string;
}

/**
 * Required documents, exactly as stored on the scheme record.
 *
 * Nothing is added here. If the record lists three documents, three are shown.
 * If it lists none, the empty message is shown rather than a generic guess at
 * what a scheme usually needs.
 *
 * The section title is rendered by the parent, so this component only renders
 * the numbered list or the empty state.
 */
export function DocumentChecklist({ documents, emptyLabel }: DocumentChecklistProps) {
  if (documents.length === 0) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3.5">
      {documents.map((document, index) => (
        <li
          key={document}
          className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-low"
        >
          <span
            className="font-headline-sm text-headline-sm text-outline font-bold leading-none mt-0.5"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-body-md text-body-md text-on-surface">{document}</span>
        </li>
      ))}
    </ul>
  );
}
