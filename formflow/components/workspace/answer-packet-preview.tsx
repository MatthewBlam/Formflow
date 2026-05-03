'use client';

import type { AnswerPacket } from '@/lib/assistant/answer-packet';

interface AnswerPacketPreviewProps {
  packet: AnswerPacket;
}

export function AnswerPacketPreview({ packet }: AnswerPacketPreviewProps) {
  const answerCount = packet.sections.reduce((count, section) => count + section.answers.length, 0);
  const missingCount = packet.sections.reduce((count, section) => count + section.missing.length, 0);

  return (
    <section className="min-h-0 flex-1 overflow-auto bg-secondary/20 p-4">
      <div className="mb-4 rounded-xl bg-card p-4 shadow-sm shadow-foreground/5 ring-1 ring-border/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Answer packet</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{packet.title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {answerCount} answered
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {missingCount} missing
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {packet.issues.length} issue{packet.issues.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {packet.sections.map((section) => (
          <div
            key={section.id}
            className="overflow-hidden rounded-xl bg-card shadow-sm shadow-foreground/5 ring-1 ring-border/40"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {section.answers.length}/{section.answers.length + section.missing.length}
              </span>
            </div>

            {section.answers.length > 0 && (
              <dl className="divide-y divide-border/60">
                {section.answers.map((answer) => (
                  <div key={answer.fieldId} className="grid gap-1 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {answer.label}
                    </dt>
                    <dd className="text-sm leading-6 text-foreground">{answer.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {section.answers.length === 0 && section.missing.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No guided fields in this section.</p>
            )}

            {section.missing.length > 0 && (
              <div className="border-t border-border/70 bg-muted/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still needed</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  {section.missing.map((item) => (
                    <li key={item.fieldId} className="flex items-start gap-2">
                      <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/60" />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        <div className="rounded-xl bg-card p-4 shadow-sm shadow-foreground/5 ring-1 ring-border/40">
          <h3 className="text-sm font-semibold text-foreground">Documents</h3>
          <div className="mt-3 grid gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marked present</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                {packet.documents.present.length ? packet.documents.present.join(', ') : 'None marked yet'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still needed</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {packet.documents.needed.length ? packet.documents.needed.join(', ') : 'None'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 shadow-sm shadow-foreground/5 ring-1 ring-border/40">
          <h3 className="text-sm font-semibold text-foreground">Issues</h3>
          {packet.issues.length === 0 ? (
            <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
              No check issues found.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
              {packet.issues.map((issue) => (
                <li key={issue.id} className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="font-medium leading-6 text-foreground">{issue.message}</p>
                  <p className="mt-1 leading-6">{issue.suggestion}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
