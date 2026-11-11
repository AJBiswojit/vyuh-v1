import { Navigate, Route, Routes } from 'react-router-dom'
import FacultyDashboardPage from './FacultyDashboardPage.jsx'
import QuestionBankPage from './QuestionBankPage.jsx'
import FacultyExamsPage from './FacultyExamsPage.jsx'
import ExamBuilderPage from './ExamBuilderPage.jsx'
import FacultyExamDetailPage from './FacultyExamDetailPage.jsx'
import ItemAnalysisPage from './ItemAnalysisPage.jsx'
import FacultyClassesPage from './FacultyClassesPage.jsx'
import FacultyRecordingsPage from './FacultyRecordingsPage.jsx'
import FacultyAttendancePage from './FacultyAttendancePage.jsx'
import FacultyDoubtsPage from './FacultyDoubtsPage.jsx'
import FacultyDoubtDetailPage from './FacultyDoubtDetailPage.jsx'
import FacultySupportPage from './FacultySupportPage.jsx'
import FacultyAccountPage from './FacultyAccountPage.jsx'

export default function FacultyRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<FacultyDashboardPage />} />
      <Route path="question-bank" element={<QuestionBankPage />} />
      <Route path="question-bank/new" element={<QuestionBankPage />} />
      <Route path="exams" element={<FacultyExamsPage />} />
      <Route path="exams/new" element={<ExamBuilderPage />} />
      <Route path="exams/:examId" element={<FacultyExamDetailPage />} />
      <Route path="exams/:examId/edit" element={<ExamBuilderPage />} />
      <Route path="item-analysis" element={<ItemAnalysisPage />} />
      <Route path="classes" element={<FacultyClassesPage />} />
      <Route path="classes/:classId/studio" element={<FacultyClassesPage />} />
      <Route path="recordings" element={<FacultyRecordingsPage />} />
      <Route path="attendance" element={<FacultyAttendancePage />} />
      <Route path="doubts" element={<FacultyDoubtsPage />} />
      <Route path="doubts/:doubtId" element={<FacultyDoubtDetailPage />} />
      <Route path="support" element={<FacultySupportPage />} />
      <Route path="account" element={<FacultyAccountPage />} />
      <Route path="*" element={<Navigate to="/faculty/dashboard" replace />} />
    </Routes>
  )
}
