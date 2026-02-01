// Force rebuild
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MaterialListPage } from '@/features/materials/MaterialListPage';
import { CreateMaterialPage } from '@/features/materials/CreateMaterialPage';
import { CreateTestRunPage } from './features/quality/CreateTestRunPage';
import { MeasurementDetailPage } from './features/quality/MeasurementDetailPage';
import { MaterialDetailPage } from '@/features/materials/MaterialDetailPage';
import { LayupListPage } from '@/features/layups/LayupListPage';
import { LayupDetailPage } from '@/features/layups/LayupDetailPage';
import { CreateLayupPage } from '@/features/layups/CreateLayupPage';
import { AssemblyListPage } from '@/features/assemblies/AssemblyListPage';
import { AssemblyDetailPage } from '@/features/assemblies/AssemblyDetailPage';
import { CreateAssemblyPage } from '@/features/assemblies/CreateAssemblyPage';
import { DataImportPage } from '@/features/imports/DataImportPage';
import { RequirementProfileListPage } from '@/features/quality/RequirementProfileListPage';
import { RequirementProfileDetailPage } from '@/features/quality/RequirementProfileDetailPage';
import { MeasurementsPage } from '@/features/quality/MeasurementsPage';
import { AnalysisDashboard } from '@/features/analysis/AnalysisDashboard';

import { CorrelationView } from '@/features/analysis/CorrelationView';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AuthProvider } from '@/lib/auth';
import { Protect } from '@/components/auth/Protect';

const NotFound = () => <div className="p-8 text-center text-red-500">404: Page Not Found</div>;

function App() {
  return (
    <AuthProvider>
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="materials" element={<MaterialListPage />} />
            <Route path="materials/new" element={<CreateMaterialPage />} />
            <Route path="materials/:id" element={<MaterialDetailPage />} />
            <Route path="layups" element={<LayupListPage />} />
            <Route path="layups/new" element={<CreateLayupPage />} />
            <Route path="layups/:id" element={<LayupDetailPage />} />
            <Route path="assemblies" element={<AssemblyListPage />} />
            <Route path="assemblies/new" element={<CreateAssemblyPage />} />
            <Route path="assemblies/:id" element={<AssemblyDetailPage />} />

            <Route path="standards" element={<RequirementProfileListPage />} />
            <Route path="standards/:id" element={<RequirementProfileDetailPage />} />

            <Route path="quality/measurements" element={<MeasurementsPage />} />
            <Route path="quality/test-run" element={<CreateTestRunPage />} />
            <Route path="measurements/new" element={<CreateTestRunPage />} />
            <Route path="measurements/:id" element={<MeasurementDetailPage />} />
            <Route path="quality/analysis" element={<AnalysisDashboard />} />

            <Route path="analysis/compare" element={<AnalysisDashboard />} />
            <Route path="analysis/correlation" element={<CorrelationView />} />

            <Route path="compare" element={<AnalysisDashboard />} /> {/* Legacy redirect? */}
            <Route
              path="imports"
              element={
                <Protect permission="import:data" fallback={<div className="p-8 text-red-500">Access Denied: You need 'Lab' or 'Admin' permissions</div>}>
                  <DataImportPage />
                </Protect>
              }
            />
            <Route
              path="settings"
              element={
                <Protect permission="manage:settings" fallback={<div className="p-8 text-red-500">Access Denied: Admins Only</div>}>
                  <div className="animate-in fade-in duration-500">
                    <SettingsPage />
                  </div>
                </Protect>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
