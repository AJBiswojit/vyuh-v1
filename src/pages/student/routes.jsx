import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './DashboardPage.jsx'
import ExamsListPage from './ExamsListPage.jsx'
import ExamInstructionsPage from './ExamInstructionsPage.jsx'
import ExamLivePage from './ExamLivePage.jsx'
import ExamResultPage from './ExamResultPage.jsx'
import ExamAnalysisPage from './ExamAnalysisPage.jsx'
import LiveClassesPage from './LiveClassesPage.jsx'
import LiveClassDetailPage from './LiveClassDetailPage.jsx'
import StudentClassroomPage from './StudentClassroomPage.jsx'
import RecordingsPage from './RecordingsPage.jsx'
import RecordingDetailPage from './RecordingDetailPage.jsx'
import PerformancePage from './PerformancePage.jsx'
import DoubtsPage from './DoubtsPage.jsx'
import DoubtDetailPage from './DoubtDetailPage.jsx'
import AttendancePage from './AttendancePage.jsx'
import ProfilePage from './ProfilePage.jsx'
import SupportPage from './SupportPage.jsx'

export default function StudentRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="exams" element={<ExamsListPage />} />
      <Route path="exams/:examId/instructions" element={<ExamInstructionsPage />} />
      <Route path="exams/:examId/live" element={<ExamLivePage />} />
      <Route path="exams/:examId/result" element={<ExamResultPage />} />
      <Route path="exams/:examId/analysis" element={<ExamAnalysisPage />} />
      <Route path="live-classes" element={<LiveClassesPage />} />
      <Route path="live-classes/:classId" element={<LiveClassDetailPage />} />
      <Route path="live-classes/:classId/room" element={<StudentClassroomPage />} />
      <Route path="recordings" element={<RecordingsPage />} />
      <Route path="recordings/:recordingId" element={<RecordingDetailPage />} />
      <Route path="performance" element={<PerformancePage />} />
      <Route path="doubts" element={<DoubtsPage />} />
      <Route path="doubts/:doubtId" element={<DoubtDetailPage />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="support" element={<SupportPage />} />
      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
    </Routes>
  )
}
