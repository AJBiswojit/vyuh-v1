import { useCallback, useState } from 'react'
import Hero from '../../components/Hero'
import AboutSection from '../../components/AboutSection'
import WaysToLearn from '../../components/WaysToLearn'
import Experts from '../../components/Experts'
import Capabilities from '../../components/Capabilities'
import Process from '../../components/Process'
import PrepJourney from '../../components/PrepJourney'
import Programs from '../../components/Programs'
import Testimonials from '../../components/Testimonials'
import VideoModal from '../../components/VideoModal'
import PublicLayout from '../../components/public/PublicLayout'
import PublicNavbar from '../../components/public/PublicNavbar'
import useReveal from '../../hooks/useReveal'

/* ------------------------------------------------------------------
   HOME — the existing landing page, unchanged section for section.

   What moved: the page now renders inside `PublicLayout`, so the seven-link
   navbar and the full footer are the same components every other public page
   uses. The landing page's own <NavBar> and <Footer> were thin wrappers around
   the same design and are superseded by the shared pair — there is one navbar
   implementation in the codebase, not two.

   The hero still sits on the tall `.hero-sky` canopy with the navbar drawn
   inside that band, so the original composition — transparent pill on sky, then
   the video frame — is preserved exactly.
------------------------------------------------------------------- */

export default function LandingPage() {
  const [videoOpen, setVideoOpen] = useState(false)
  const revealRef = useReveal()

  const closeVideo = useCallback(() => setVideoOpen(false), [])

  return (
    <PublicLayout metaKey="home" nav="none" footer="cream">
      <div ref={revealRef}>
        <div className="hero-sky">
          <PublicNavbar variant="home" />
          <span id="main-content" className="sr-only" />
          <Hero onOpenVideo={() => setVideoOpen(true)} />
        </div>

        <AboutSection onOpenVideo={() => setVideoOpen(true)} />
        <WaysToLearn />
        <Experts />
        <Capabilities />
        <Process />
        <PrepJourney />
        <Programs />
        <Testimonials />
      </div>

      <VideoModal open={videoOpen} onClose={closeVideo} />
    </PublicLayout>
  )
}
