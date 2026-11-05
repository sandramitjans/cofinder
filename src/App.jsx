import { useApp } from './context/AppContext'
import { VIEWS, MODERATOR_VIEWS } from './constants'
import RegisterView from './views/RegisterView'
import HomeView from './views/HomeView'
import { EditProfileView } from './views/RegisterView'
import ModeratorPanelView from './views/ModeratorPanelView'
import ProjectorView from './views/ProjectorView'
import LoginView from './views/LoginView'
import ModeratorGate from './components/ModeratorGate'

// Router de la SPA (mapa vista → componente)
const ROUTES = {
  [VIEWS.REGISTER]: RegisterView,
  [VIEWS.HOME]: HomeView,
  [VIEWS.EDIT]: EditProfileView,
  [VIEWS.MOD_PANEL]: ModeratorPanelView,
  [VIEWS.PROJECTOR]: ProjectorView,
  [VIEWS.LOGIN]: LoginView,
}

export default function App() {
  const { view, modUnlocked, currentUser } = useApp()

  // Guardas: las vistas de moderadora exigen PIN; HOME exige estar registrado
  let active = view
  if (MODERATOR_VIEWS.includes(view) && !modUnlocked) active = currentUser ? VIEWS.HOME : VIEWS.REGISTER
  if ((view === VIEWS.HOME || view === VIEWS.EDIT) && !currentUser) active = VIEWS.REGISTER
  if (view === VIEWS.LOGIN && currentUser) active = VIEWS.HOME // ya conectado en este dispositivo
  const View = ROUTES[active] ?? RegisterView

  return (
    <>
      <div key={active} className="animate-view-in">
        <View />
      </div>
      <ModeratorGate />
    </>
  )
}
