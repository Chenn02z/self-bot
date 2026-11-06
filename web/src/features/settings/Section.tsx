import { sectionTitle } from '../../ui/styles'

export default function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={`${sectionTitle} mb-2 px-1`}>{title}</h2>
      {children}
      {hint && <p className="mt-2 px-1 text-sm text-mute">{hint}</p>}
    </section>
  )
}
