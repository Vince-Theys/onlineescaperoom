import { useRef } from "react"
import { Camera } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Props {
  displayAvatar: string | null
  initials: string
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function AccountAvatarUpload({
  displayAvatar,
  initials,
  onFileChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-24 w-24 ring-2 ring-border">
          {displayAvatar && (
            <AvatarImage
              src={displayAvatar}
              alt="Profielfoto"
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute right-0 bottom-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition-opacity hover:opacity-90"
          title="Foto wijzigen"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Klik op het camera-icoon om je profielfoto te wijzigen
      </p>
    </div>
  )
}
