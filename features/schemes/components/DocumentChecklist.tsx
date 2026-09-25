import React from 'react';
import { FileText } from 'lucide-react';

export interface DocumentChecklistProps {
  documents: string[];
  title: string;
  emptyLabel: string;
}

/**
 * Required documents, exactly as stored on the scheme record.
 *
 * Nothing is added here. If the record lists three documents, three are shown.
 * If it lists none, the empty message is shown rather than a generic guess at
 * what a loan usually needs.
 */
export function DocumentChecklist({ documents, title, emptyLabel }: DocumentChecklistProps) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-800 mb-2">{title}</h3>

      {documents.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li
              key={document}
              className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3"
            >
              <FileText className="h-4 w-4 shrink-0 mt-0.5 text-green-700" aria-hidden="true" />
              <span className="text-sm text-gray-800">{document}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
