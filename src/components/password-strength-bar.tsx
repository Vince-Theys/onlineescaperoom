export function PasswordStrengthBar({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (password.length >= 12) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  })()

  const labels = ['', 'Zwak', 'Matig', 'Goed', 'Sterk', 'Zeer sterk']
  const colours = ['', '#e91852', '#f97316', '#eab308', '#22c55e', '#2bc2e2']

  if (!password) return null
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? colours[score] : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <span className="text-xs font-medium" style={{ color: colours[score] }}>
        {labels[score]}
      </span>
    </div>
  )
}
