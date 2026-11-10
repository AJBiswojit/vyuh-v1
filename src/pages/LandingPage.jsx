import { useCallback, useState } from 'react'
import NavBar from '../components/NavBar'
import Hero from '../components/Hero'
import AboutSection from '../components/AboutSection'
import WaysToLearn from '../components/WaysToLearn'
import Experts from '../components/Experts'
import Capabilities from '../components/Capabilities'
import Process from '../components/Process'
import PrepJourney from '../components/PrepJourney'
import Programs from '../components/Programs'
import Testimonials from '../components/Testimonials'
import Footer from '../components/Footer'
import VideoModal from '../components/VideoModal'
import useReveal from '../hooks/useReveal'

export default function LandingPage() {
  const [videoOpen, setVideoOpen] = useState(false)
  const revealRef = useReveal()

  const closeVideo = useCallback(() => setVideoOpen(false), [])

  return (
    <div ref={revealRef} className="min-h-screen bg-white">
      <div aria-hidden="true" className="page-haze" />
      <a
        href="#about"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-[13px]"
      >
        Skip to content
      </a>

      <div className="hero-sky">
        <NavBar />
        <Hero onOpenVideo={() => setVideoOpen(true)} />
      </div>

      <main>
        <AboutSection onOpenVideo={() => setVideoOpen(true)} />
        <WaysToLearn />
        <Experts />
        <Capabilities />
        <Process />
        <PrepJourney />
        <Programs />
        <Testimonials />
      </main>

      <Footer />
      <VideoModal open={videoOpen} onClose={closeVideo} />
    </div>
  )
}
