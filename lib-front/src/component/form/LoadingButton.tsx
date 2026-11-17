import { ReactNode } from "react"
import { Button } from "react-bootstrap"

type Props = {
  isLoading: boolean
  isValid?: boolean
  children: ReactNode
} & Pick<React.ComponentProps<typeof Button>, "type" | "variant">

export function LoadingButton({
  isLoading,
  isValid = true,
  children,
  ...buttonProps
}: Props) {
  return (
    <Button
      type="submit"
      disabled={isLoading || !isValid}
      {...buttonProps}
    >
      {isLoading ? <i className="fas fa-spinner fa-spin me-2" /> : null}
      {children}
    </Button>
  )
}
