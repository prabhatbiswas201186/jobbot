import { Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { AppShell } from './pages/app/AppShell';
import { Dashboard } from './pages/app/Dashboard';
import { ResumeStudio } from './pages/app/ResumeStudio';
import { JobMatch } from './pages/app/JobMatch';
import { InterviewCoach } from './pages/app/InterviewCoach';
import { Tracker } from './pages/app/Tracker';
import { Negotiation } from './pages/app/Negotiation';
import { Analytics } from './pages/app/Analytics';
import { CareerPath } from './pages/app/CareerPath';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="resume" element={<ResumeStudio />} />
        <Route path="jobs" element={<JobMatch />} />
        <Route path="interview" element={<InterviewCoach />} />
        <Route path="tracker" element={<Tracker />} />
        <Route path="negotiation" element={<Negotiation />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="career" element={<CareerPath />} />
      </Route>
    </Routes>
  );
}

export default App;
