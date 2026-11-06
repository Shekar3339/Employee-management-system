function StatCard({ icon: Icon, label, value }) {
  return (
    <article className="stat-card">
      <div className="stat-card__icon" aria-hidden="true">
        <Icon size={22} />
      </div>
      <div>
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value ?? '—'}</p>
      </div>
    </article>
  )
}

export default StatCard
