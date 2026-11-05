import { About } from '@/components/About'
import { Contents } from '@/components/Contents'
import { Features } from '@/components/Features'
import { Footer } from '@/components/Footer'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { Introduction } from '@/components/Introduction'
import { NavBar } from '@/components/NavBar'
import { Pricing } from '@/components/Pricing'

export default function Home() {
  return (
    <>
      <Hero />
      <Introduction />
      <NavBar />
      <Contents />
      <HowItWorks />
      <Features />
      <Pricing />
      <About />
      <Footer />
    </>
  )
}
