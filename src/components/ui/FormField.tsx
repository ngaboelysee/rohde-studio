"use client";

import { forwardRef, useId } from "react";

type FormFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, hint, id, className = "", ...props },
  ref
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="label-field">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className="input-rohde"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : null, error ? errorId : null]
          .filter(Boolean)
          .join(" ") || undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-concrete-dim">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
});
