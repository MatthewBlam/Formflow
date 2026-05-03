# Requirements Document

## Introduction

FormFlow is an AI-powered web application that transforms confusing government PDF forms into interactive visual guides with plain-language explanations, guided interviews, and document-aware completion workflows. The primary target users are elderly immigrants, non-native English speakers, and low-digital-literacy individuals completing complex public benefits forms. The MVP demonstrates the full workflow using the California SAWS 2 PLUS form (covering CalFresh and Medi-Cal) as the demo form.

Demo form source: https://www.dhcs.ca.gov/formsandpubs/laws/Documents/SPA%2013-022%20Attachment%202%20SAWS%202%20PLUS_FINAL%207%2024%2013%20ADA.pdf

The application does not provide legal advice, guarantee eligibility, or submit forms to government agencies. It serves as a guided review and completion support tool.

## Glossary

- **FormFlow_App**: The web application that renders uploaded PDF forms, provides AI-powered explanations, conducts guided interviews, and tracks form completion state.
- **PDF_Viewer**: The component responsible for rendering uploaded PDF pages in the browser with page navigation controls.
- **Extraction_Service**: The backend service that parses PDF text, identifies fields, sections, checkboxes, labels, and page coordinates from uploaded forms.
- **Visual_Form_Map**: The interactive overlay layer that renders colored bounding boxes, labels, and status indicators on top of the rendered PDF pages.
- **Explainer_Panel**: The side panel that displays plain-language explanations, examples, and context when a user clicks a field or section on the Visual_Form_Map.
- **Interview_Engine**: The AI-driven component that asks the user one question at a time in plain language and maps answers to structured form fields.
- **Application_Profile**: The structured data store that holds all user answers, their sources, confidence levels, mapped field IDs, and evidence requirements.
- **Contradiction_Detector**: The rule engine that evaluates the Application_Profile for logical inconsistencies and missing evidence using deterministic rules.
- **Document_Checklist**: The component that generates and displays a list of supporting documents required based on form fields and user answers. Document status values are: needed and present. "Present" indicates the user has confirmed they have the document (not a file upload).
- **Review_Dashboard**: The final screen that summarizes form completion status, unresolved issues, missing documents, and suggested next steps.
- **Form_Schema**: The structured representation of a government form including its sections, fields, labels, bounding boxes, field types, and requirements. May be pre-seeded for demo reliability or generated via extraction.
- **Field_Status**: The current state of a form field. Valid values are: missing (yellow), complete (green), needs_confirmation (orange), inferred (blue), and conflicting (red). Gray is used for neutral section outlines. Blue outline/glow is used for hover or focus state and is not a persisted status.
- **Issue**: A detected problem in the Application_Profile such as a contradiction between answers or missing required evidence.
- **Demo_Form**: The California SAWS 2 PLUS form from the California Department of Health Care Services, loaded from the pinned demo PDF URL and used as the primary demonstration form for the MVP.

## Requirements

### Requirement 1: PDF Upload

**User Story:** As a user, I want to upload a government form PDF so that FormFlow can analyze it and guide me through completion.

#### Acceptance Criteria

1. THE FormFlow_App SHALL provide a file upload control that accepts PDF files.
2. WHEN a user uploads a valid PDF file, THE FormFlow_App SHALL display an upload success state with the file name.
3. WHEN a user uploads a file that is not a valid PDF, THE FormFlow_App SHALL display a descriptive error message indicating the file type is not supported.
4. WHEN a user uploads a PDF that exceeds the maximum supported size, THE FormFlow_App SHALL display an error message stating the file is too large.
5. THE FormFlow_App SHALL provide a "Try demo form" action that loads the pre-seeded Demo_Form without requiring the user to upload a file.
6. WHEN the user selects "Try demo form," THE FormFlow_App SHALL load the pinned California SAWS 2 PLUS PDF from the Demo_Form source URL.

### Requirement 2: PDF Rendering

**User Story:** As a user, I want to see my uploaded PDF rendered clearly in the browser so that I can visually reference the original form while receiving guidance.

#### Acceptance Criteria

1. WHEN a PDF is uploaded or the Demo_Form is loaded, THE PDF_Viewer SHALL render all pages of the PDF clearly in the browser.
2. THE PDF_Viewer SHALL provide page navigation controls allowing the user to move between pages.
3. THE PDF_Viewer SHALL render the Demo_Form without visual distortion or missing content.
4. WHILE the PDF is being rendered, THE PDF_Viewer SHALL display a loading indicator.

### Requirement 3: PDF Structure Extraction

**User Story:** As a user, I want the app to automatically identify the sections and fields in my form so that I can receive targeted guidance for each part.

#### Acceptance Criteria

1. WHEN the Demo_Form is loaded, THE Extraction_Service SHALL load the pre-seeded Form_Schema for the curated demo subset. The curated subset SHALL include 15–25 high-impact fields covering: applicant info, household size and members, income, rent and utilities, address proof, income proof, and signature/date.
2. THE Extraction_Service SHALL associate each extracted field with its parent section.
3. WHEN a non-demo PDF is uploaded, THE FormFlow_App SHALL render the PDF and MAY run best-effort extraction. IF extraction confidence is low, THE FormFlow_App SHALL clearly indicate that only limited guidance is available and offer the Demo_Form instead.
4. FOR ALL extracted FormField objects, THE Extraction_Service SHALL initialize the Field_Status to missing.

### Requirement 4: Visual Form Map Overlay

**User Story:** As a user, I want to see highlighted sections and fields on the PDF so that I can understand the form structure and track my progress visually.

#### Acceptance Criteria

1. WHEN the Form_Schema is available, THE Visual_Form_Map SHALL render colored bounding box overlays on the PDF for each detected section and field.
2. THE Visual_Form_Map SHALL display each field overlay using a color that corresponds to its current Field_Status: yellow for missing, green for complete, orange for needs_confirmation, blue for inferred, and red for conflicting. Gray SHALL be used for neutral section outlines. Blue outline or glow SHALL indicate hover or focus state and is not a persisted Field_Status.
3. WHEN a field's Field_Status changes, THE Visual_Form_Map SHALL update the overlay color for that field within the current view without requiring a page reload.
4. THE Visual_Form_Map SHALL display a label on or near each field overlay showing the field's plain-language label.
5. THE Visual_Form_Map SHALL display a progress bar indicating the percentage of required fields with a Field_Status of complete.

### Requirement 5: Plain-Language Field Explainer

**User Story:** As a user, I want to click on a form field and get a simple explanation so that I can understand what is being asked without knowing legal or bureaucratic jargon.

#### Acceptance Criteria

1. WHEN a user clicks a field overlay on the Visual_Form_Map, THE Explainer_Panel SHALL open and display a plain-language explanation for that field.
2. THE Explainer_Panel SHALL include the following information for each field: what the question means in simple language, why the agency asks this question, an example answer, what supporting documents may be needed, and a common mistake to avoid where applicable.
3. THE Explainer_Panel SHALL use language at or below an eighth-grade reading level.
4. THE Explainer_Panel SHALL provide action buttons including "Fill this with me," "Show example," "Why do they ask this?", and "What proof do I need?".
5. WHEN a user clicks "Fill this with me" in the Explainer_Panel, THE Interview_Engine SHALL begin a guided interview starting with that field's related question.
6. THE Form_Schema SHALL include pre-written plain-language explanations for each demo field. AI regeneration or translation of explanations is optional and treated as a stretch goal.

### Requirement 6: Guided Interview

**User Story:** As a user, I want the app to walk me through the form by asking me simple questions one at a time so that I can complete the form without feeling overwhelmed.

#### Acceptance Criteria

1. WHEN the user initiates a guided interview, THE Interview_Engine SHALL present one question at a time using plain language. The interview sequence SHALL be driven by the pre-seeded Form_Schema, not generated by the LLM at runtime.
2. THE Interview_Engine SHALL display each question with a large text input area, an "I'm not sure" button, and a "Why are you asking?" button.
3. WHEN the user answers a question, THE Interview_Engine SHALL map the answer to the corresponding fields in the Application_Profile using the mappedFieldIds defined in the Form_Schema and update the Field_Status of those fields. The LLM MAY rephrase questions in plain language or Spanish but SHALL NOT decide field mappings or interview flow.
4. WHEN the user clicks "I'm not sure," THE Interview_Engine SHALL record the answer as uncertain, set the mapped field's Field_Status to needs_confirmation, and proceed to the next question.
5. WHEN the user clicks "Why are you asking?", THE Interview_Engine SHALL display a brief explanation of why the information is needed and which form field it maps to.
6. THE Interview_Engine SHALL allow the user to navigate back to previous questions and revise prior answers.
7. WHEN the user revises a prior answer, THE Interview_Engine SHALL update the Application_Profile and recalculate the Field_Status for all affected fields.
8. THE Interview_Engine SHALL continue asking questions until all required fields in the current section are addressed.

### Requirement 7: Application Profile State Management

**User Story:** As a user, I want my answers to be saved and tracked so that I can see my progress and resume where I left off.

#### Acceptance Criteria

1. WHEN the user provides an answer through the Interview_Engine or manual edit, THE Application_Profile SHALL store the answer value, source (user_chat, extracted_document, manual_edit, or inferred), confidence score, list of mapped field IDs, and evidence requirement if applicable.
2. THE FormFlow_App SHALL persist the Application_Profile answers and document statuses to localStorage so that the user can close the browser and resume later. Derived data such as Issues, completion percentage, and suggested next steps SHALL be recomputed on load rather than persisted.
3. WHEN the FormFlow_App loads and a persisted Application_Profile exists in localStorage, THE FormFlow_App SHALL restore the previous session state including all field statuses and answers.
4. THE Application_Profile SHALL maintain a one-to-many mapping between user answers and form fields, so that a single answer can populate multiple related fields.
5. WHEN an answer in the Application_Profile changes, THE FormFlow_App SHALL propagate the updated Field_Status to the Visual_Form_Map and the Review_Dashboard.

### Requirement 8: Contradiction and Confusion Detection

**User Story:** As a user, I want the app to flag inconsistencies in my answers so that I can correct mistakes before submitting the form.

#### Acceptance Criteria

1. WHEN the Application_Profile is updated, THE Contradiction_Detector SHALL evaluate all active detection rules against the current profile state.
2. WHEN the user reports employment_status as unemployed and monthly_income_from_work is greater than zero, THE Contradiction_Detector SHALL create an Issue of type contradiction with a message explaining the conflict and a suggested clarifying question.
3. WHEN the reported household_size does not equal the count of listed household members, THE Contradiction_Detector SHALL create an Issue of type contradiction with a message explaining the mismatch.
4. WHEN an address value is present and the proof_of_address document requirement is not satisfied, THE Contradiction_Detector SHALL create an Issue of type missing_evidence linked to the address field.
5. WHEN an income value is present and the proof_of_income document requirement is not satisfied, THE Contradiction_Detector SHALL create an Issue of type missing_evidence linked to the income field.
6. WHEN a required signature field is detected and its Field_Status is not complete, THE Contradiction_Detector SHALL create an Issue of type missing_required linked to the signature field.
7. WHEN an Issue is created, THE Visual_Form_Map SHALL update the Field_Status of the related fields to conflicting and display the Issue indicator on the affected overlays.
8. WHEN the user resolves a contradiction by updating an answer, THE Contradiction_Detector SHALL re-evaluate the relevant rules and remove the Issue if the contradiction no longer exists.

Note: Paystub-based contradiction detection (e.g., comparing stated income to paystub amounts) is a stretch goal unless document upload and classification are already implemented.

### Requirement 9: Supporting Document Checklist

**User Story:** As a user, I want to see a clear list of documents I need to gather so that I know exactly what proof to bring when submitting my application.

#### Acceptance Criteria

1. WHEN the Form_Schema and Application_Profile are available, THE Document_Checklist SHALL generate a list of required supporting documents based on the form's evidence requirements and the user's answers.
2. THE Document_Checklist SHALL display each document requirement with a title, a plain-language explanation of what the document proves, examples of acceptable documents, and the current status (needed or present).
3. THE Document_Checklist SHALL link each document requirement to the form fields that depend on it.
4. WHEN the user marks a document as present (via an "I have this document" checkbox), THE Document_Checklist SHALL update the document status to present and THE Contradiction_Detector SHALL re-evaluate any related missing_evidence Issues.
5. WHEN the user's answers change in a way that adds or removes evidence requirements, THE Document_Checklist SHALL update dynamically to reflect the current requirements.

### Requirement 10: Final Review Dashboard

**User Story:** As a user, I want to see a summary of my form's readiness before I submit so that I feel confident everything is complete and correct.

#### Acceptance Criteria

1. WHEN the user navigates to the Review_Dashboard, THE Review_Dashboard SHALL display the overall completion percentage calculated as the number of required fields with Field_Status complete divided by the total number of required fields.
2. THE Review_Dashboard SHALL display a list of completed sections with a visual indicator of section-level completion.
3. THE Review_Dashboard SHALL display a list of fields with Field_Status missing, needs_confirmation, or conflicting, grouped by section.
4. THE Review_Dashboard SHALL display all unresolved Issues with their severity, message, and related fields.
5. THE Review_Dashboard SHALL display the Document_Checklist summary showing documents that are still needed.
6. THE Review_Dashboard SHALL display a suggested next step based on the current state, such as "Resolve 2 conflicts" or "Gather proof of address."
7. WHEN the user clicks on a missing field or unresolved Issue in the Review_Dashboard, THE FormFlow_App SHALL navigate to the corresponding field on the Visual_Form_Map or open the relevant Interview_Engine question.

### Requirement 11: Spanish Translation Support

**User Story:** As a non-native English speaker, I want to view explanations in Spanish so that I can understand the form guidance in my preferred language.

#### Acceptance Criteria

1. THE FormFlow_App SHALL provide a language toggle allowing the user to switch between English and Spanish.
2. WHEN the user selects Spanish, THE Explainer_Panel SHALL display pre-seeded demo field explanations, example answers, and guidance text in Spanish.
3. WHEN the user selects Spanish, THE Interview_Engine SHALL present guided interview prompts and contextual explanations in Spanish.
4. WHEN the user switches languages, THE FormFlow_App SHALL preserve all Application_Profile data and Field_Status values without loss.

Note: Full UI translation and dynamic translation of arbitrary uploaded PDFs are stretch goals. Spanish support is targeted to demo field explanations and guided interview prompts only.

### Requirement 12: Accessibility and Inclusive Design

**User Story:** As a user with limited digital literacy, I want the interface to be simple, clear, and easy to navigate so that I can use the app without assistance.

#### Acceptance Criteria

1. THE FormFlow_App SHALL use a minimum font size of 16 pixels for body text and 20 pixels for headings.
2. THE FormFlow_App SHALL maintain a minimum color contrast ratio of 4.5:1 for all text against its background, conforming to WCAG 2.1 AA standards.
3. THE FormFlow_App SHALL support keyboard navigation for all interactive elements including the Visual_Form_Map overlays, Interview_Engine controls, and Review_Dashboard links.
4. THE FormFlow_App SHALL use plain language throughout the interface, avoiding legal jargon, bureaucratic terminology, and technical terms without accompanying explanations.
5. THE FormFlow_App SHALL display one question at a time during the guided interview to reduce cognitive load.
6. THE FormFlow_App SHALL allow the user to edit and confirm any answer before it is finalized.
7. THE FormFlow_App SHALL display visible progress indicators showing how far the user has progressed through the form completion workflow.
8. THE FormFlow_App SHALL NOT use color as the sole indicator of Field_Status. Each field status SHALL also have a text label, icon, tooltip, or accessible label so that status is perceivable without relying on color alone.

### Requirement 13: AI Safety Guardrails

**User Story:** As a user, I want the app to be honest about its limitations so that I do not rely on it for legal or eligibility decisions.

#### Acceptance Criteria

1. THE FormFlow_App SHALL NOT display statements that guarantee eligibility for any government program.
2. THE FormFlow_App SHALL NOT present any output as legal advice.
3. WHEN the AI generates an explanation or suggested next step, THE FormFlow_App SHALL use hedging language such as "This may apply to you," "You should double-check this before submitting," and "Based on what you told me." The FormFlow_App SHALL prefer "next step" and "things to double-check" over "recommendation" language.
4. THE FormFlow_App SHALL display a persistent disclaimer stating that the app provides guidance only and is not a substitute for professional legal or benefits counseling.
5. THE FormFlow_App SHALL NOT recommend that the user submit the form without reviewing it first.
6. THE Review_Dashboard and the Explainer_Panel SHALL each display a visible "This is guidance only — not legal advice" disclaimer.

### Requirement 14: Landing Page

**User Story:** As a first-time visitor, I want to immediately understand what FormFlow does and feel reassured so that I am willing to try it.

#### Acceptance Criteria

1. THE FormFlow_App SHALL display a landing page with a clear headline explaining the app's purpose in plain language.
2. THE FormFlow_App SHALL provide two primary actions on the landing page: "Upload a PDF" and "Try demo form."
3. THE FormFlow_App SHALL display the landing page using large text, high contrast, and minimal visual clutter.
4. THE FormFlow_App SHALL include a reassuring privacy note on the landing page stating: "Your progress is saved only in this browser. When AI help is used, selected form text, page images, or answers may be sent for AI processing. No account is required."

### Requirement 15: Upload Processing Feedback

**User Story:** As a user, I want to see what the app is doing while it processes my form so that I trust it is working and do not feel anxious.

#### Acceptance Criteria

1. WHILE the Extraction_Service is processing an uploaded PDF, THE FormFlow_App SHALL display a step-by-step progress indicator showing the current processing stage.
2. THE FormFlow_App SHALL display the following processing stage labels in sequence: "Reading form," "Finding sections," "Finding questions," and "Preparing plain-language guide."
3. IF the Extraction_Service encounters an error during processing, THEN THE FormFlow_App SHALL display a descriptive error message and offer the user the option to retry or try the Demo_Form instead.

### Requirement 16: Session Persistence Without Login

**User Story:** As a user, I want my progress to be saved automatically without creating an account so that I can return to my form later without extra steps.

#### Acceptance Criteria

1. THE FormFlow_App SHALL NOT require user authentication or account creation.
2. THE FormFlow_App SHALL automatically persist the current session state to localStorage after each user interaction that modifies the Application_Profile or Field_Status.
3. WHEN the user returns to the FormFlow_App in the same browser, THE FormFlow_App SHALL offer to resume the previous session or start a new one.
4. WHEN the user chooses to start a new session, THE FormFlow_App SHALL clear the previous session data from localStorage.

### Requirement 17: Form Schema Parser and Serializer

**User Story:** As a developer, I want the Form_Schema to be reliably parsed from JSON and serialized back to JSON so that pre-seeded schemas and extracted schemas are handled consistently.

#### Acceptance Criteria

1. WHEN a JSON representation of a Form_Schema is provided, THE Extraction_Service SHALL parse the JSON into a structured Form_Schema object containing sections and fields with all required properties.
2. THE Extraction_Service SHALL serialize a Form_Schema object back into a valid JSON representation.
3. FOR ALL valid Form_Schema objects, parsing the serialized JSON and then serializing the result SHALL produce a JSON representation equivalent to the original serialization (round-trip property).
4. WHEN the JSON input is missing required properties or contains invalid values, THE Extraction_Service SHALL return a descriptive validation error identifying the specific issue.

### Requirement 18: AI Response State Safety

**User Story:** As a developer, I want AI-generated responses to be validated before they affect application state so that the app remains reliable and predictable.

#### Acceptance Criteria

1. AI-generated responses SHALL NOT directly mutate application state. Any AI response that affects state SHALL be parsed through a strict schema and validated before use.
2. WHEN an AI response fails schema validation, THE FormFlow_App SHALL discard the invalid response and log the validation error without updating the Application_Profile or Field_Status.
3. THE FormFlow_App SHALL use structured output schemas for all AI responses that feed application state, including explainer content, interview question phrasing, answer normalization results, and extraction responses.
