'use client';

import type { AnswerPacket } from '@/lib/assistant/answer-packet';

interface AnswerPacketPreviewProps {
  packet: AnswerPacket;
}

export function AnswerPacketPreview({ packet }: AnswerPacketPreviewProps) {
  return (
    <section className="min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Answer packet</p>
        <h2 className="text-lg font-semibold text-foreground">{packet.title}</h2>
      </div>

      <div className="flex flex-col gap-4">
        {packet.sections.map((section) => (
          <div key={section.id} className="rounded-md border p-3">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            {section.answers.length > 0 && (
              <dl className="mt-2 flex flex-col gap-2">
                {section.answers.map((answer) => (
                  <div key={answer.fieldId}>
                    <dt className="text-xs text-muted-foreground">{answer.label}</dt>
                    <dd className="text-sm text-foreground">{answer.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {section.missing.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground">Missing</p>
                <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                  {section.missing.map((item) => (
                    <li key={item.fieldId}>{item.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        <div className="rounded-md border p-3">
          <h3 className="text-sm font-semibold text-foreground">Documents</h3>
          <p className="mt-2 text-sm text-foreground">
            Present: {packet.documents.present.length ? packet.documents.present.join(', ') : 'None marked yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Needed: {packet.documents.needed.length ? packet.documents.needed.join(', ') : 'None'}
          </p>
        </div>

        <div className="rounded-md border p-3">
          <h3 className="text-sm font-semibold text-foreground">Issues</h3>
          {packet.issues.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No check issues found.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
              {packet.issues.map((issue) => (
                <li key={issue.id}>
                  <span className="font-medium text-foreground">{issue.message}</span>
                  <br />
                  {issue.suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
