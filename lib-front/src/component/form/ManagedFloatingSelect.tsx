import { FieldValues, useController } from "react-hook-form"
import { ManagedPropsWithLabel } from "./type"
import { FloatingLabel, Form } from "react-bootstrap"
import { useId } from "react"

type Props<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> = ManagedPropsWithLabel<TFieldValues, TContext, TTransformedValues> & {
  options: { value: string; label: string; disabled?: boolean }[]
}

export function ManagedFloatingSelect<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues>({ control, name, label, helper, options }: Props<TFieldValues, TContext, TTransformedValues>) {
  const id = useId()
  const { field, fieldState } = useController({ control, name })

  return (
    <Form.Group>
      <FloatingLabel controlId={id} label={label}>
        <Form.Select id={id} {...field} isInvalid={!!fieldState.error}>
          {options.map((option, index) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </Form.Select>
      </FloatingLabel>
      {fieldState.error ? <Form.Text className="text-danger">{fieldState.error.message}</Form.Text> : helper != null ? <Form.Text className="text-muted">{helper}</Form.Text> : null}
    </Form.Group>
  )
}
