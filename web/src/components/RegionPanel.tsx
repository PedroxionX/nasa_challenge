import { COUNTRY_NAMES, type RegionProps } from '../lib/geo'

interface Props {
  region: RegionProps | null
  onClose: () => void
}

// Huecos donde irán los resultados del pipeline cuando el equipo defina el contrato de datos.
const PLACEHOLDERS = [
  { title: 'Serie de tiempo', hint: 'Gráfica con la variable y su línea de tendencia', tall: true },
  { title: 'Cambio por década', hint: 'Pendiente de Sen ×10, con intervalo de confianza' },
  { title: '¿Es significativo?', hint: 'Mann-Kendall · valor p' },
  { title: 'Años para ser significativo', hint: 'Weatherhead et al. (1998)' },
]

export default function RegionPanel({ region, onClose }: Props) {
  return (
    <aside className={`region-panel ${region ? 'open' : ''}`} aria-hidden={!region}>
      {region && (
        <>
          <header className="region-panel__header">
            <div>
              <p className="eyebrow">{COUNTRY_NAMES[region.country]} · {region.id}</p>
              <h2>{region.name}</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar panel">✕</button>
          </header>

          <div className="region-panel__body">
            {PLACEHOLDERS.map(p => (
              <section key={p.title} className={`placeholder ${p.tall ? 'tall' : ''}`}>
                <h3>{p.title}</h3>
                <p>{p.hint}</p>
              </section>
            ))}
            <p className="pending-note">Pendiente: conectar con los datos del pipeline.</p>
          </div>
        </>
      )}
    </aside>
  )
}
