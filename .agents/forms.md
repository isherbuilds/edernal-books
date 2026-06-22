# Form Patterns

Use this when adding or refactoring forms in `apps/web`.

This repo uses React Hook Form, Zod v4, TanStack Query, and React Compiler. The
goal is small form code now, with clear paths for later accounting workflows
such as invoice editors, line items, autosave, and previews.

## Defaults

- Use `useZodForm(schema, options)` from `apps/web/src/hooks/use-zod-form.ts`.
- Default validation is `mode: "onSubmit"` and `reValidateMode: "onBlur"`.
  This keeps forms quiet while the user types. First validation happens on
  submit or an explicit wizard-step `trigger`; already-failed fields revalidate
  on blur instead of every keystroke.
- Use Zod schemas from the owning slice or `packages/core` when the contract is
  shared with API or DB code.
- Use `z.input<typeof Schema>` for editable form values when transforms or
  coercion exist. Use `z.output<typeof Schema>` for submitted values after
  parsing.

## Field Rules

- Native input in a small form: use `register` and pass `formState.errors[name]`
  into a presentational field component.
- Custom controlled widget: use `Controller` or `useController`, and read
  `fieldState.error` instead of parent `formState.errors`.
- Add `noValidate` to forms owned by React Hook Form and Zod so browser-native
  constraint bubbles do not bypass the resolver. Plain FormData/native forms can
  keep browser validation.
- Large form or invoice editor: use scoped subscriptions (`useFormState`,
  `useWatch`, `useController`) where rerender isolation matters.
- Select, date picker, money input, rich editor, autocomplete, and upload
  controls are controlled widgets. Do not force them through `register`.
- Keep presentational field UI in `apps/web/src/components/form-fields.tsx`
  unless it becomes app-agnostic enough for `packages/ui`.

## Rerender Policy

React Compiler handles most memoization. Do not add `React.memo`, `useMemo`, or
`useCallback` as default ceremony.

Use RHF subscriptions instead of parent-wide form state reads when rerenders
matter:

- Prefer `useFormState({ name, exact: true })` for field errors.
- Prefer `useWatch({ name })` for totals, previews, dependent fields, autosave,
  and invoice editor commands.
- Avoid `form.watch()` across many values in large components unless the whole
  component really needs to rerender.
- Avoid destructuring `formState.errors` in a parent that renders many fields.
- Do not add subscription wrappers unless field-level rerender behavior matters.
- If a real large form needs field-level error isolation, add a small local
  component with `useFormState({ name, exact: true })` near that form instead of
  making every simple form pay for it.
- High-churn invoice editors should override `useZodForm` validation mode if
  full-schema validation on change becomes measurable.

## Mutation Submit Rules

- Use `mutate` when the mutation owns success and error behavior through
  `onSuccess` and `onError`.
- Use `mutateAsync` when the caller must await the mutation before taking the
  next step, such as a wizard final submit or a parent-provided `onSubmit`.
- If using `mutateAsync` with local error toasts in `onError`, catch the
  rejection or let the caller handle it intentionally.
- Return promises from TanStack Query `onSuccess` invalidations when pending UI
  should stay active until cache work finishes.

## Accounting Form Shape

For complex accounting screens, split by responsibility:

```text
components/invoices/
  invoice-editor.tsx
  invoice-line-items.tsx
hooks/
  use-invoice-editor.ts
  use-invoice.ts
utils/
  invoice-totals.ts
  invoice-defaults.ts
```

Use this shape for invoice-like workflows:

- `FormProvider` owns the form.
- `useFieldArray` owns line items.
- `useWatch` drives totals, preview, autosave, and dependent UI.
- Pure math stays in `utils/`.
- Query invalidation stays in hook files.

## Hook Extraction

Create hooks for reusable React orchestration:

- `useXForm` for form setup, defaults, submit mapping, validation policy.
- `useXQuery` and `useXMutation` for TanStack Query policy.
- `useXAutosave` for debounced save and dirty snapshot behavior.
- `useXParams` for route or search param normalization.

Do not create hooks for pure transforms. Put those in `utils/`.
Do not create pass-through hooks that only hide one `orpc` call with no policy.

## Midday Reference Snapshot

Midday was inspected as an external benchmark at commit
`51587319f26a0ffaa9dfccab1920373cb65689b7`.

Patterns adopted:

- `useZodForm` helper idea.
- `FormProvider` for complex form trees.
- `useWatch` for invoice totals, previews, and editor commands.
- `useFieldArray` for invoice line items.
- TanStack Query invalidation from mutation callbacks.

Patterns not copied wholesale:

- Shadcn `FormField` render-prop wrapper for every simple input. It adds
  ceremony where `register` is enough.
- Broad `watch()` use in large components. Prefer scoped `useWatch`.
