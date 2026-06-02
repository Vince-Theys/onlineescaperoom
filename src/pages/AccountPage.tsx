import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase"
import { usePageTitle } from "@/hooks/use-page-title"
import type { User } from "@supabase/supabase-js"
import AccountAvatarUpload from "@/components/account/AccountAvatarUpload"
import AccountProfileForm from "@/components/account/AccountProfileForm"
import AccountPasswordForm from "@/components/account/AccountPasswordForm"

function getInitials(
  firstName: string,
  lastName: string,
  email: string
): string {
  const name = [firstName, lastName].filter(Boolean).join(" ") || email
  return name
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("")
}

export default function AccountPage() {
  usePageTitle("Account")

  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      setUser(u)
      setFirstName(u.user_metadata?.first_name ?? "")
      setLastName(u.user_metadata?.last_name ?? "")
      setAvatarUrl(u.user_metadata?.avatar_url ?? null)
    })
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)

    try {
      let newAvatarUrl = avatarUrl

      if (pendingFile) {
        const ext = pendingFile.name.split(".").pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, pendingFile, { upsert: true })

        if (uploadError) {
          throw new Error(`Foto uploaden mislukt: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path)
        newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
      }

      const fullName = [firstName, lastName].filter(Boolean).join(" ")
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          avatar_url: newAvatarUrl,
        },
      })

      if (updateError) {
        throw new Error(`Opslaan mislukt: ${updateError.message}`)
      }

      setAvatarUrl(newAvatarUrl)
      setPendingFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <AccountAvatarUpload
        displayAvatar={avatarPreview ?? avatarUrl}
        initials={getInitials(firstName, lastName, user?.email ?? "")}
        onFileChange={handleFileChange}
      />
      <AccountProfileForm
        user={user}
        firstName={firstName}
        lastName={lastName}
        error={error}
        saving={saving}
        saved={saved}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onSave={handleSave}
      />
      <AccountPasswordForm />
    </div>
  )
}
