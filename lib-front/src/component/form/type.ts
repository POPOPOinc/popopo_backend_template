import { Control, FieldPath, FieldValues } from "react-hook-form"

export type ManagedBaseProps<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> = {
  control: Control<TFieldValues, TContext, TTransformedValues>,
  name: FieldPath<TFieldValues>,
  helper?: string,
  required?: boolean,
  disabled?: boolean
}

export type ManagedPropsWithLabel<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> =
  ManagedBaseProps<TFieldValues, TContext, TTransformedValues> & {
  label: string
}

export type ManagedPropsWithOptionalLabel<TFieldValues extends FieldValues, TContext = unknown, TTransformedValues = TFieldValues> =
  ManagedBaseProps<TFieldValues, TContext, TTransformedValues> & {
  label?: string
}
