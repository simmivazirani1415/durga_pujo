import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/dm-serif-display/latin-400.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-700.css'
import '@fontsource/cormorant-garamond/latin-600-italic.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import '@fontsource/tiro-bangla/bengali-400.css'
import './index.css'
import { App } from './App'

const root = createRoot(document.getElementById('root')!)
const params = new URLSearchParams(location.search)

if (import.meta.env.DEV && params.has('pandals')) {
  import('./dev/Pandals').then(({ Pandals }) => root.render(<Pandals />))
} else if (import.meta.env.DEV && (params.has('scene') || params.has('auto') || params.has('ui'))) {
  import('./dev/Preview').then(({ Preview }) => root.render(<Preview />))
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
