import { type ComponentProps, useId } from "react"
import { Form } from "react-bootstrap"
import { type FieldValues, useController } from "react-hook-form"
import type { ManagedPropsWithOptionalLabel } from "./type"

type Props<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> = ManagedPropsWithOptionalLabel<TFieldValues, TContext, TTransformedValues> &
  // 問題なさそうなものを随時追加していく
  Pick<ComponentProps<typeof Form.Control>, "type" | "min" | "max" | "maxLength" | "placeholder" | "style">

export function ManagedInput<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues>({ control, name, label, helper, required, ...formControlProps }: Props<TFieldValues, TContext, TTransformedValues>) {
  const id = useId()
  const { field, fieldState } = useController({ name, control })

  return (
    <Form.Group controlId={id}>
      {
        label == null ? null : (
          <Form.Label>
            {label}
            {required ? <span className="text-danger">*</span> : null}
          </Form.Label>
        )
      }
      <Form.Control required={required} {...formControlProps} {...field} />
      {fieldState.error ? <Form.Text className="text-danger">{fieldState.error.message}</Form.Text> : helper != null ? <Form.Text className="text-muted">{helper}</Form.Text> : null}
    </Form.Group>
  )
}
