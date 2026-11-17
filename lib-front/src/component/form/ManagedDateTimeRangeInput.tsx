import { useId } from "react"
import { Col, Form, Row } from "react-bootstrap"
import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form"

// 共通のプロパティ
type BaseProps<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> = {
  startName: FieldPath<TFieldValues>
  endName: FieldPath<TFieldValues>
  control: Control<TFieldValues, TContext, TTransformedValues>
  label?: string
  helper?: string
  required?: boolean
}

// unlimitedOptionがfalseの場合
type PropsWithoutUnlimited<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> = BaseProps<TFieldValues, TContext, TTransformedValues> & {
  unlimitedOption?: false
  unlimitedName?: never
  unlimitedLabel?: never
}

// unlimitedOptionがtrueの場合
type PropsWithUnlimited<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> = BaseProps<TFieldValues, TContext, TTransformedValues> & {
  unlimitedOption: true
  unlimitedName: FieldPath<TFieldValues>
  unlimitedLabel?: string
}

type Props<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> =
  | PropsWithoutUnlimited<TFieldValues, TContext, TTransformedValues>
  | PropsWithUnlimited<TFieldValues, TContext, TTransformedValues>

export function ManagedDateTimeRangeInput<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues>(
  props: Props<TFieldValues, TContext, TTransformedValues>
) {
  const {
    control,
    startName,
    endName,
    label,
    helper,
    required,
    unlimitedOption = false,
    unlimitedLabel = "無期限",
  } = props

  const id = useId()
  const startId = `${id}-start`
  const endId = `${id}-end`
  const unlimitedId = `${id}-unlimited`

  const unlimitedName = (unlimitedOption && "unlimitedName" in props
    ? props.unlimitedName
    : `${endName}_unlimited_dummy`) as FieldPath<TFieldValues>

  const startField = useController({ name: startName, control })
  const endField = useController({ name: endName, control })
  const unlimitedFieldRaw = useController({ name: unlimitedName, control })
  const unlimitedField = unlimitedOption ? unlimitedFieldRaw : null

  return (
    <Form.Group>
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger">*</span>}
        </Form.Label>
      )}

      <Row className="align-items-start">
        <Col md={5}>
          <Form.Control
            id={startId}
            type="datetime-local"
            {...startField.field}
          />
          {startField.fieldState.error && (
            <Form.Text className="text-danger">
              {startField.fieldState.error.message}
            </Form.Text>
          )}
        </Col>

        <Col className="pt-2 text-center" md={2}>
          <span className="text-muted">〜</span>
        </Col>

        <Col md={5}>
          <Form.Control
            id={endId}
            type="datetime-local"
            {...endField.field}
            disabled={unlimitedField?.field.value}
          />
          {unlimitedOption && unlimitedField && (
            <Form.Check
              className="mt-2"
              id={unlimitedId}
              label={unlimitedLabel}
              type="checkbox"
              {...unlimitedField.field}
              checked={unlimitedField.field.value}
            />
          )}
          {endField.fieldState.error && (
            <Form.Text className="text-danger">
              {endField.fieldState.error.message}
            </Form.Text>
          )}
        </Col>
      </Row>

      {helper && <Form.Text className="mt-2 text-muted">{helper}</Form.Text>}
    </Form.Group>
  )
}
