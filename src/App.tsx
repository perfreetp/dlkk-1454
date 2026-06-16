import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import TaskConfig from '@/pages/TaskConfig';
import MigrationExecution from '@/pages/MigrationExecution';
import BackupStrategy from '@/pages/BackupStrategy';
import RecoveryVerification from '@/pages/RecoveryVerification';
import LogAudit from '@/pages/LogAudit';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<TaskConfig />} />
          <Route path="/execution" element={<MigrationExecution />} />
          <Route path="/migration" element={<MigrationExecution />} />
          <Route path="/backup" element={<BackupStrategy />} />
          <Route path="/recovery" element={<RecoveryVerification />} />
          <Route path="/logs" element={<LogAudit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
