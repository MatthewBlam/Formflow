import { saws2PlusForm, type DemoFormDefinition } from './saws2plus';

export const demoForms = [saws2PlusForm] satisfies DemoFormDefinition[];

export function getDemoForm(id: string | null | undefined) {
  return demoForms.find((form) => form.id === id) ?? null;
}

export function getDefaultDemoForm() {
  return demoForms[0];
}
