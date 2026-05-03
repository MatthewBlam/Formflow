'use client';

import type { FormField } from '@/types';

interface FieldExplainerProps {
  field: FormField | null;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getFieldContext(field: FormField) {
  const text = `${field.id} ${field.label} ${field.plainLanguageLabel ?? ''}`.toLowerCase();
  const title = field.plainLanguageLabel ?? field.label;

  if (includesAny(text, ['social security', 'ssn'])) {
    return {
      meaning: 'This is the Social Security number for the person applying. If the person has one and is applying for benefits, write the number exactly as it appears on official records.',
      why: 'The county uses this to check identity, benefits history, and eligibility. If someone does not have a Social Security number, they may still be able to apply, but the county may ask follow-up questions.',
      example: 'Example: 123-45-6789',
      mistake: 'Do not write another family member’s number here. If you are not sure whether this question applies, choose “I’m not sure” and come back to it.',
    };
  }

  if (includesAny(text, ['address', 'city', 'county', 'state', 'zip', 'apartment'])) {
    return {
      meaning: `This asks where ${title.toLowerCase().includes('mail') ? 'mail should be sent' : 'you live or can be reached'}. Use the address where the county can contact you.`,
      why: 'The county uses address information to decide which office handles the case and where to send important notices. If you do not have a permanent home, use the best mailing address or directions where you can receive messages.',
      example: field.exampleAnswer ?? 'Example: 123 Main St, Apt 4B, Fresno, CA 93721',
      mistake: 'Do not leave this blank just because your housing is temporary. A shelter, trusted mailing address, or clear directions can still help the county contact you.',
    };
  }

  if (includesAny(text, ['income', 'wage', 'earned', 'job', 'employer', 'pay'])) {
    return {
      meaning: 'This asks about money that someone in the household receives. Include work pay and other income when the question asks for it.',
      why: 'Income helps the county decide which programs you qualify for and the amount of help your household may receive.',
      example: field.exampleAnswer ?? 'Example: $1,200 per month from work, paid every two weeks.',
      mistake: 'Use gross income when the form asks for it. Gross income means the amount before taxes or deductions are taken out.',
    };
  }

  if (includesAny(text, ['name', 'representative'])) {
    return {
      meaning: 'This asks for the legal name of the person or helper connected to this part of the application.',
      why: 'Names help the county match the right person to the right records and avoid delays caused by spelling differences.',
      example: field.exampleAnswer ?? 'Example: Maria Elena Garcia',
      mistake: 'Use the name from official documents when possible. If the person also uses another name, add it where the form asks for other names.',
    };
  }

  if (includesAny(text, ['phone', 'email'])) {
    return {
      meaning: 'This tells the county how to contact you about the application.',
      why: 'A working phone number or email can help the county ask questions, schedule interviews, and send updates faster.',
      example: field.exampleAnswer ?? 'Example: (555) 123-4567',
      mistake: 'Use a number or email you can check regularly. If it belongs to someone else, make sure they can reliably give you messages.',
    };
  }

  if (includesAny(text, ['program', 'calfresh', 'cash aid', 'medi-cal', 'health coverage'])) {
    return {
      meaning: 'This asks which benefits you want to apply for. You can choose more than one if your household needs more than one kind of help.',
      why: 'The county uses this answer to route your application to the right programs and ask only the questions needed for those programs.',
      example: field.exampleAnswer ?? 'Example: CalFresh and Medi-Cal/Health Coverage.',
      mistake: 'Do not skip a program just because you are unsure you qualify. Applying lets the county check eligibility.',
    };
  }

  return {
    meaning: `This field is asking for: ${title}. Answer with the clearest information you have right now.`,
    why: field.whyAsking ?? 'The county uses this information to understand your household and decide what help you may qualify for.',
    example: field.exampleAnswer ?? 'If you are not sure, write your best answer and mark it for review.',
    mistake: 'Do not guess if the answer could affect eligibility. Use “I’m not sure” in the Answer tab and return to this field later.',
  };
}

export function FieldExplainer({ field }: FieldExplainerProps) {
  if (!field) return null;

  const title = field.plainLanguageLabel ?? field.label;
  const context = getFieldContext(field);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">What this means</p>
        <p className="text-sm leading-6 text-foreground">{context.meaning}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Why we ask</p>
        <p className="text-sm leading-6 text-foreground">{field.whyAsking ?? context.why}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Example</p>
        <p className="text-sm leading-6 text-foreground">{context.example}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Common mistake</p>
        <p className="text-sm leading-6 text-foreground">{context.mistake}</p>
      </div>
    </div>
  );
}
