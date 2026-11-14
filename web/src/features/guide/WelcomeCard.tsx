/** ESBOZO de 002 (T007). Dueño tras la fusión: 006. */
import { useAppState } from '../../app/state'
import { UI_COPY } from '../../content'

export default function WelcomeCard() {
  const { setRegion, setVariable, resetPeriod } = useAppState()
  const open = (id: string) => { setVariable('T2M'); resetPeriod(); setRegion(id) }
  return (
    <div className="stub stub-welcome">
      <span className="stub-tag">Esbozo · 006</span>
      <p>{UI_COPY.welcome}</p>
      <div className="stub-row">
        <button type="button" onClick={() => open('MX-BCN')}>Ver un ejemplo: Baja California</button>
        <button type="button" onClick={() => open('MX-SON')}>Ver un ejemplo: Sonora</button>
      </div>
    </div>
  )
}
