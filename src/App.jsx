import { Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PlaceholderPage from './pages/PlaceholderPage'
import './index.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PlaceholderPage
            title="Log In"
            description="Sign in to your Vyuh account to continue with your preparation."
            actionLabel="Contact support"
          />
        }
      />
      <Route
        path="/signup"
        element={
          <PlaceholderPage
            title="Sign Up"
            description="Create your Vyuh account to access courses, test series, and analytics."
            actionLabel="Get started with Vyuh"
          />
        }
      />
      <Route
        path="/programs"
        element={
          <PlaceholderPage
            title="Programs"
            description="Structured JEE, NEET, and foundation programs built around concept clarity and practice."
            actionLabel="Back to home"
          />
        }
      />
      <Route
        path="/pricing"
        element={
          <PlaceholderPage
            title="Pricing"
            description="Program fees and inclusions. For current batch-wise pricing, please speak to our admissions team."
            actionLabel="Back to home"
          />
        }
      />
      <Route
        path="/about"
        element={
          <PlaceholderPage
            title="About Vyuh"
            description="A focused learning platform built by educators, for serious aspirants."
            actionLabel="Back to home"
          />
        }
      />
      <Route
        path="/support"
        element={
          <PlaceholderPage
            title="Support"
            description="For help with your account, tests, or study material, reach us at hello@vyuh.in."
            actionLabel="Back to home"
          />
        }
      />
      <Route
        path="/contact"
        element={
          <PlaceholderPage
            title="Contact"
            description="Write to hello@vyuh.in and our team will respond within one working day."
            actionLabel="Back to home"
          />
        }
      />
      <Route path="*" element={<PlaceholderPage title="Page not found" description="The page you are looking for does not exist." actionLabel="Back to home" />} />
    </Routes>
  )
}
