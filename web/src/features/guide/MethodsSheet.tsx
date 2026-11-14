/** ESBOZO de 002 (T007). Dueño tras la fusión: 006. El armazón la coloca dentro de un diálogo. */
import { useEffect, useState } from 'react'
import { loadCatalog, type Catalog } from '../../lib/data'
import { UI_COPY } from '../../content'

export default function MethodsSheet() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  useEffect(() => { loadCatalog().then(setCatalog).catch(() => setCatalog(null)) }, [])
  return (
    <div className="stub stub-methods">
      <span className="stub-tag">Esbozo · 006</span>
      <h2>Métodos y fuentes</h2>
      {catalog ? (
        <ul>
          <li>Pendiente: {catalog.method.slope}</li>
          <li>Prueba: {catalog.method.test}</li>
          <li>Intervalo: {catalog.method.interval}</li>
          <li>α = {catalog.alpha}</li>
          <li>Periodo: {catalog.period.first_year}–{catalog.period.last_complete_year}</li>
        </ul>
      ) : <p>Cargando el catálogo…</p>}
      <p>{UI_COPY.notCause}</p>
    </div>
  )
}
