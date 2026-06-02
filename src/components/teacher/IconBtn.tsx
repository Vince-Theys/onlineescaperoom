import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
  title: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

export default function IconBtn({ children, title, onClick, disabled, danger }: Props) {
  return (
    <Button
      variant="ghost"
      title={title}
      onClick={onClick}
      disabled={disabled}
      size="icon"
      className={`rounded-lg border border-transparent transition-colors disabled:opacity-40 ${
        danger
          ? "text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  )
}
