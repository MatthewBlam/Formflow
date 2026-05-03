import { DEMO_PDF_URL } from '@/lib/constants';
import type { FormSchema, Issue, ProfileEntry } from '@/types';

export interface DemoCheckRule {
  id: string;
  label: string;
  run: (context: {
    schema: FormSchema;
    profile: Record<string, ProfileEntry>;
    documentStatusMap: Record<string, 'needed' | 'present'>;
  }) => Issue[];
}

export interface DemoFormDefinition {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  schema: FormSchema;
  sectionOrder: string[];
  checkRules: DemoCheckRule[];
}

function box(page: number, x: number, y: number, width = 0.28, height = 0.026) {
  return { page, x, y, width, height };
}

const schema: FormSchema = {
  id: 'saws2plus',
  title: 'SAWS 2 PLUS Benefits Application',
  sections: [
    {
      id: 'programs',
      title: 'Programs you want',
      fields: [
        {
          id: 'programs_requested',
          label: 'Programs requested',
          plainLanguageLabel: 'Which benefits do you want to apply for?',
          type: 'select',
          required: true,
          page: 1,
          bbox: box(1, 0.12, 0.17, 0.45),
          whyAsking:
            'The county uses this to route your application to the right benefit programs.',
          exampleAnswer: 'CalFresh and Medi-Cal',
          options: ['CalFresh', 'Medi-Cal', 'CalWORKs', 'General Assistance'],
        },
        {
          id: 'expedited_food_help',
          label: 'Expedited service request',
          plainLanguageLabel: 'Do you need food help right away?',
          type: 'checkbox',
          required: false,
          page: 1,
          bbox: box(1, 0.12, 0.23, 0.35),
          whyAsking:
            'Some households can get faster CalFresh processing when money or food is very low.',
          exampleAnswer: 'Yes, if you have very little money for food this month.',
          options: ['Yes', 'No', 'Not sure'],
        },
      ],
    },
    {
      id: 'applicant',
      title: 'Applicant information',
      fields: [
        {
          id: 'applicant_name',
          label: 'Name of applicant',
          plainLanguageLabel: 'What is your full legal name?',
          type: 'text',
          required: true,
          page: 1,
          bbox: box(1, 0.1, 0.32),
          whyAsking: 'The county needs your name to create or find your case record.',
          exampleAnswer: 'Maria Elena Garcia',
        },
        {
          id: 'date_of_birth',
          label: 'Date of birth',
          plainLanguageLabel: 'What is your date of birth?',
          type: 'date',
          required: true,
          page: 1,
          bbox: box(1, 0.42, 0.32, 0.18),
          whyAsking: 'Age can affect program rules and helps confirm identity.',
          exampleAnswer: '04/12/1976',
        },
        {
          id: 'ssn',
          label: 'Social Security number',
          plainLanguageLabel: 'What is your Social Security number, if you have one?',
          type: 'text',
          required: false,
          page: 1,
          bbox: box(1, 0.62, 0.32, 0.2),
          whyAsking:
            'If you have one and are applying for benefits, the county uses it to verify records.',
          exampleAnswer: '123-45-6789',
        },
        {
          id: 'phone',
          label: 'Phone number',
          plainLanguageLabel: 'What phone number can the county use to reach you?',
          type: 'text',
          required: false,
          page: 1,
          bbox: box(1, 0.1, 0.38),
          whyAsking:
            'A working phone number helps the county ask follow-up questions and schedule interviews.',
          exampleAnswer: '(555) 123-4567',
        },
      ],
    },
    {
      id: 'address',
      title: 'Address and mailing',
      fields: [
        {
          id: 'home_address',
          label: 'Home address',
          plainLanguageLabel: 'Where do you live now?',
          type: 'text',
          required: true,
          page: 1,
          bbox: box(1, 0.1, 0.48, 0.52),
          whyAsking:
            'The county uses your address to decide which office handles your case and where notices should go.',
          exampleAnswer: '123 Main St Apt 4B',
        },
        {
          id: 'city_state_zip',
          label: 'City, state, zip',
          plainLanguageLabel: 'What city, state, and ZIP code is that address in?',
          type: 'text',
          required: true,
          page: 1,
          bbox: box(1, 0.1, 0.53, 0.42),
          whyAsking: 'This completes your address so the county can contact you.',
          exampleAnswer: 'Fresno, CA 93721',
        },
        {
          id: 'mailing_address',
          label: 'Mailing address',
          plainLanguageLabel: 'Should mail go somewhere different?',
          type: 'text',
          required: false,
          page: 1,
          bbox: box(1, 0.1, 0.58, 0.52),
          whyAsking:
            'Use this if you get mail at a different place, including a trusted mailing address.',
          exampleAnswer: 'Same as home address',
        },
      ],
    },
    {
      id: 'household',
      title: 'Household',
      fields: [
        {
          id: 'household_size',
          label: 'Number of people in household',
          plainLanguageLabel: 'How many people live in your household?',
          type: 'number',
          required: true,
          page: 2,
          bbox: box(2, 0.12, 0.18, 0.18),
          whyAsking:
            'Household size affects benefits and helps the county understand who is applying together.',
          exampleAnswer: '3',
        },
        {
          id: 'household_members',
          label: 'Household member names',
          plainLanguageLabel: 'Who lives with you?',
          type: 'text',
          required: true,
          page: 2,
          bbox: box(2, 0.12, 0.24, 0.55),
          whyAsking:
            'The county needs the names of household members to review household eligibility.',
          exampleAnswer: 'Maria Garcia, Ana Garcia, Luis Garcia',
        },
        {
          id: 'marital_status',
          label: 'Marital status',
          plainLanguageLabel: 'What is your marital status?',
          type: 'select',
          required: false,
          page: 2,
          bbox: box(2, 0.12, 0.3, 0.28),
          whyAsking: 'Some programs ask this to understand household relationships.',
          exampleAnswer: 'Single',
          options: ['Single', 'Married', 'Separated', 'Divorced', 'Widowed'],
        },
      ],
    },
    {
      id: 'income',
      title: 'Income and work',
      fields: [
        {
          id: 'employment_status',
          label: 'Employment status',
          plainLanguageLabel: 'Are you working right now?',
          type: 'select',
          required: true,
          page: 3,
          bbox: box(3, 0.1, 0.18, 0.28),
          whyAsking:
            'The county uses work status with income information to review eligibility.',
          exampleAnswer: 'Working part time',
          options: ['Working', 'Unemployed', 'Retired', 'Disabled', 'Student'],
        },
        {
          id: 'employer_name',
          label: 'Employer name',
          plainLanguageLabel: 'Who do you work for?',
          type: 'text',
          required: false,
          page: 3,
          bbox: box(3, 0.1, 0.24, 0.36),
          whyAsking:
            'If you work, employer information helps confirm where your income comes from.',
          exampleAnswer: 'ABC Market',
        },
        {
          id: 'monthly_income',
          label: 'Monthly income from work',
          plainLanguageLabel: 'How much money do you earn from work each month before taxes?',
          type: 'number',
          required: true,
          page: 3,
          bbox: box(3, 0.1, 0.3, 0.24),
          whyAsking:
            'Income helps the county decide what programs and benefit amounts may apply.',
          exampleAnswer: '$1,200',
        },
        {
          id: 'other_income',
          label: 'Other income',
          plainLanguageLabel: 'Do you get money from any other source?',
          type: 'text',
          required: false,
          page: 3,
          bbox: box(3, 0.1, 0.36, 0.36),
          whyAsking:
            'Other income may include disability, retirement, child support, unemployment, or gifts.',
          exampleAnswer: 'SSI $500 per month',
        },
      ],
    },
    {
      id: 'expenses',
      title: 'Housing and utility costs',
      fields: [
        {
          id: 'monthly_rent',
          label: 'Rent or mortgage',
          plainLanguageLabel: 'How much do you pay for rent or mortgage each month?',
          type: 'number',
          required: false,
          page: 4,
          bbox: box(4, 0.1, 0.2, 0.24),
          whyAsking:
            'Housing costs can affect CalFresh and some other benefit calculations.',
          exampleAnswer: '$900',
        },
        {
          id: 'utility_costs',
          label: 'Utility costs',
          plainLanguageLabel: 'Do you pay utilities like gas, electric, water, or phone?',
          type: 'text',
          required: false,
          page: 4,
          bbox: box(4, 0.1, 0.26, 0.38),
          whyAsking:
            'Utility costs can affect deductions used in benefit calculations.',
          exampleAnswer: 'Electric and gas, about $150 per month',
        },
      ],
    },
    {
      id: 'signature',
      title: 'Signature',
      fields: [
        {
          id: 'signature',
          label: 'Signature',
          plainLanguageLabel: 'Did you sign the application?',
          type: 'checkbox',
          required: true,
          page: 7,
          bbox: box(7, 0.1, 0.72, 0.32),
          whyAsking:
            'The county usually cannot process the application unless it is signed.',
          exampleAnswer: 'Yes, I signed it.',
          options: ['Yes', 'No'],
        },
        {
          id: 'signature_date',
          label: 'Date signed',
          plainLanguageLabel: 'What date did you sign it?',
          type: 'date',
          required: true,
          page: 7,
          bbox: box(7, 0.46, 0.72, 0.22),
          whyAsking: 'The signature date shows when you certified the application.',
          exampleAnswer: '05/02/2026',
        },
      ],
    },
  ],
  documentRequirements: [
    {
      id: 'proof_of_identity',
      title: 'Proof of identity',
      plainExplanation: 'A document that helps the county confirm who you are.',
      examples: ['State ID', 'Driver license', 'Passport', 'Birth certificate'],
    },
    {
      id: 'proof_of_address',
      title: 'Proof of address',
      plainExplanation: 'A document or letter showing where you live or receive mail.',
      examples: ['Utility bill', 'Rental agreement', 'Shelter letter', 'Mail with your name'],
    },
    {
      id: 'proof_of_income',
      title: 'Proof of income',
      plainExplanation: 'Documents showing money your household receives.',
      examples: ['Pay stubs', 'Benefits letter', 'Bank statement', 'Employer letter'],
    },
    {
      id: 'signed_application',
      title: 'Signed application',
      plainExplanation: 'The application page with your signature and date.',
      examples: ['Signed final page', 'Electronic signature confirmation'],
    },
  ],
};

function numericValue(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function memberCount(value: string | undefined) {
  if (!value?.trim()) return 0;
  return value
    .split(/,|\n|;|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function requiredMissingRule({
  schema,
  profile,
}: {
  schema: FormSchema;
  profile: Record<string, ProfileEntry>;
  documentStatusMap: Record<string, 'needed' | 'present'>;
}) {
  return schema.sections.flatMap((section) =>
    section.fields
      .filter((field) => field.required)
      .filter((field) => {
        const entry = profile[field.id];
        return !entry || entry.status === 'missing' || !entry.value.trim();
      })
      .map((field) => ({
        id: `missing_${field.id}`,
        type: 'missing_required',
        fieldIds: [field.id],
        message: `${field.plainLanguageLabel ?? field.label} is still needed in ${section.title}.`,
        suggestion: 'Answer this in chat, or mark it for review if you are not sure.',
        severity: 'warning' as const,
      }))
  );
}

export const saws2PlusForm: DemoFormDefinition = {
  id: 'saws2plus',
  title: 'SAWS 2 PLUS',
  description: 'California benefits application context for CalFresh, Medi-Cal, and cash aid.',
  pdfUrl: DEMO_PDF_URL,
  schema,
  sectionOrder: schema.sections.map((section) => section.id),
  checkRules: [
    {
      id: 'required_fields',
      label: 'Missing required fields',
      run: requiredMissingRule,
    },
    {
      id: 'income_vs_employment',
      label: 'Income and work consistency',
      run: ({ profile }) => {
        const employment = profile.employment_status?.value.toLowerCase() ?? '';
        const income = numericValue(profile.monthly_income?.value);
        if (employment.includes('unemployed') && income > 0) {
          return [
            {
              id: 'income_unemployed_conflict',
              type: 'contradiction',
              fieldIds: ['employment_status', 'monthly_income'],
              message:
                'You said you are unemployed, but also listed income from work.',
              suggestion:
                'Double-check whether this money is from a current job, past job, or another source.',
              severity: 'warning',
            },
          ];
        }
        return [];
      },
    },
    {
      id: 'household_count',
      label: 'Household count consistency',
      run: ({ profile }) => {
        const size = numericValue(profile.household_size?.value);
        const names = memberCount(profile.household_members?.value);
        if (size > 0 && names > 0 && size !== names) {
          return [
            {
              id: 'household_size_member_mismatch',
              type: 'contradiction',
              fieldIds: ['household_size', 'household_members'],
              message:
                'The household size does not match the number of household member names listed.',
              suggestion:
                'Update the number of people or add the missing household member names.',
              severity: 'warning',
            },
          ];
        }
        return [];
      },
    },
    {
      id: 'document_evidence',
      label: 'Missing document evidence',
      run: ({ profile, documentStatusMap }) => {
        const issues: Issue[] = [];
        if (profile.home_address?.value && documentStatusMap.proof_of_address !== 'present') {
          issues.push({
            id: 'address_needs_proof',
            type: 'missing_evidence',
            fieldIds: ['home_address'],
            message: 'You have an address listed, but proof of address is not marked present.',
            suggestion: 'Gather a utility bill, rental agreement, shelter letter, or similar proof.',
            severity: 'info',
          });
        }
        if (numericValue(profile.monthly_income?.value) > 0 && documentStatusMap.proof_of_income !== 'present') {
          issues.push({
            id: 'income_needs_proof',
            type: 'missing_evidence',
            fieldIds: ['monthly_income'],
            message: 'You listed income, but proof of income is not marked present.',
            suggestion: 'Gather pay stubs, a benefits letter, bank statement, or employer letter.',
            severity: 'info',
          });
        }
        if (profile.applicant_name?.value && documentStatusMap.proof_of_identity !== 'present') {
          issues.push({
            id: 'identity_needs_proof',
            type: 'missing_evidence',
            fieldIds: ['applicant_name'],
            message: 'Applicant information is present, but proof of identity is not marked present.',
            suggestion: 'Gather an ID, passport, birth certificate, or another identity document.',
            severity: 'info',
          });
        }
        return issues;
      },
    },
  ],
};
