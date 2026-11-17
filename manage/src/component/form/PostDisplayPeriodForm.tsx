import { LoadingButton, ManagedDateTimeRangeInput } from "lib-front/component"
import { useZodForm } from "lib-front/zod-form"
import { convertEpochMillisToDateTimeLocal, zDateTimeRangeInput } from "lib-common"
import { Form, Stack } from "react-bootstrap"
import type { ManageUpdatePostRequest } from "schema/api/manage/types"
import { z } from "zod/v4"

const PostDisplayPeriodFormSchema = z.object({
  display_period: zDateTimeRangeInput,
})

type Props = {
  defaultValues: ManageUpdatePostRequest
  disabled?: boolean
  onSubmit: (data: ManageUpdatePostRequest) => Promise<void>
}

export const PostDisplayPeriodForm = (props: Props) => {
  const form = useZodForm({
    schema: PostDisplayPeriodFormSchema,
    mode: "onChange",
    defaultValues: {
      display_period: {
        start_at: convertEpochMillisToDateTimeLocal(props.defaultValues.display_period.start_at),
        end_at: props.defaultValues.display_period.end_at
          ? convertEpochMillisToDateTimeLocal(props.defaultValues.display_period.end_at)
          : "",
        unlimited: props.defaultValues.display_period.end_at === null,
      },
    },
  })
  const { isSubmitting, isValid } = form.formState

  return (
    <Form onSubmit={form.handleSubmit(async (data) => {
      await props.onSubmit({
        display_period: {
          start_at: data.display_period.start_at,
          end_at: data.display_period.unlimited ? null : data.display_period.end_at,
        },
      })
    })}>
      <fieldset disabled={props.disabled}>
        <Stack gap={3}>
          <ManagedDateTimeRangeInput
            control={form.control}
            startName="display_period.start_at"
            endName="display_period.end_at"
            unlimitedOption
            unlimitedName="display_period.unlimited"
            label="表示期間"
            required
          />
          <LoadingButton type="submit" isLoading={isSubmitting} isValid={isValid && !props.disabled}>更新</LoadingButton>
        </Stack>
      </fieldset>
    </Form>
  )
}
