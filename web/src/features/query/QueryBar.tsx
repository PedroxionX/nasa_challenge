/**
 * Barra de consulta (004 T002): buscador de estado + selector de variable.
 * El armazón (002) la importa como `QueryBar` desde features/query; no cambiar ese nombre.
 */
import RegionSearch from './RegionSearch'
import VariablePicker from './VariablePicker'
import './query.css'

export default function QueryBar() {
  return (
    <div className="query-bar">
      <RegionSearch />
      <VariablePicker />
    </div>
  )
}
