// Site header for the Interactive Map and Digital Fishers 2.0: the landing page's Oceans 3.0 portal header
// (PortalHeader) with this page's name, and a breadcrumb back to the landing page.
import PortalHeader from './PortalHeader.jsx'

const PAGE_NAMES = { map: 'Interactive Map', 'digital-fishers': 'Digital Fishers 2.0' }

// band: the strip under the bar. By default it takes the colour at the top of the page's deep-ocean hero; a page
// whose hero is a photo passes 'transparent' and runs the photo up behind it.
export default function AppHeader({ active, band = 'var(--ocean-light, #12505a)' }) {
  const name = PAGE_NAMES[active]
  return (
    <PortalHeader
      name={name}
      breadcrumb={['Oceans 3.0', { label: 'Machine Learning Species Identification', href: '/' }, name]}
      band={band}
    />
  )
}
