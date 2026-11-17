import type { z } from "zod/v4"
import { type DefaultValues, type FieldValues, useForm, type UseFormProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"


export function useZodForm<TInput extends FieldValues, TOutput extends FieldValues>({
  schema,
  defaultValues,
  ...useFormProps
}: {
  schema: z.ZodType<TOutput, TInput>
  defaultValues?: DefaultValues<TInput>
} & Omit<UseFormProps<TInput, unknown, TOutput>, "defaultValues" | "resolver">) {
  return useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
    ...useFormProps,
    defaultValues
  })
}
