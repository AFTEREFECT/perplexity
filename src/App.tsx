import React, { useState, useEffect } from 'react';
import { dbManager } from './utils/database';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import SchoolEnrollmentImport from './components/SchoolEnrollmentImport';
import AdvancedReports from './components/AdvancedReports';
import DatabaseRelationships from './components/DatabaseRelationships';
import Settings from './components/Settings';
import CredentialsImport from './components/CredentialsImport';
import CredentialsManagement from './components/CredentialsManagement';
import SQLQueryTool from './components/SQLQueryTool';
import DataVerification from './components/DataVerification';
import CouncilDecisionsImport from './components/CouncilDecisionsImport';
import StudentMobilityManagement from './components/StudentMobilityManagement';
import EducationalStructure from './components/EducationalStructure';
import LevelsAndSectionsSetup from './components/LevelsAndSectionsSetup';
import ComprehensiveImport from './components/ComprehensiveImport';
import InstitutionSettings from './components/InstitutionSettings';
import SchoolEntryOverview from './components/SchoolEntryOverview';
 

import GuidanceManagement from './components/GuidanceManagement';
import GuidanceDataAnalysis from './components/GuidanceDataAnalysis';
import PrintableReports from './components/PrintableReports';
import QuizManagement from './components/QuizManagement';
import StudentFileManagement from './components/StudentFileManagement';
import QRCodeGenerator from './components/QRCodeGenerator';
import IncomingStudentsManagement from './components/IncomingStudentsManagement';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await dbManager.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('فشل في تهيئة التطبيق:', error);
        setInitError('فشل في تهيئة قاعدة البيانات. يرجى إعادة تحميل الصفحة.');
      }
    };

    initializeApp();
  }, []);

  // عرض المحتوى حسب التبويب النشط
  const renderContent = () => {
    if (!isInitialized) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تهيئة نظام إدارة التلاميذ...</p>
          </div>
        </div>
      );
    }

    if (initError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600">{initError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    // عرض المكون المناسب حسب التبويب النشط
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'students':
        return <StudentManagement />;
      case 'enrollment':
        return <SchoolEnrollmentImport />;
      case 'levels-setup':
        return <LevelsAndSectionsSetup />;
      case 'comprehensive-import':
        return <ComprehensiveImport />;
      case 'credentials-import':
        return <CredentialsImport />;
      case 'credentials':
        return <CredentialsManagement />;
      case 'council-decisions':
        return <CouncilDecisionsImport />;
      case 'guidance':
        return <GuidanceManagement />;
      case 'guidance-analysis':
        return <GuidanceDataAnalysis />;
      case 'printable-reports':
        return <PrintableReports />;
      case 'student-mobility':
        return <StudentMobilityManagement />;
      case 'educational-structure':
        return <EducationalStructure />;
      case 'institution-settings':
        return <InstitutionSettings />;
      case 'school-entry-overview':
        return <SchoolEntryOverview />;
      case 'database-relationships':
        return <DatabaseRelationships />;
      case 'reports':
        return <AdvancedReports />;
      case 'data-verification':
        return <DataVerification />;
      case 'sql-tool':
        return <SQLQueryTool />;
      case 'quiz-management':
        return <QuizManagement />;
      case 'qr-generator':
        return <QRCodeGenerator />;
      case 'file-management':
        return <StudentFileManagement />;
      case 'incoming-students':
        return <IncomingStudentsManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      {/* Overlay للهواتف */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* الشريط الجانبي */}
      <div className={`
        fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto
        transform ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0
        transition-transform duration-300 ease-in-out lg:transition-none
        w-64 lg:w-64 bg-white shadow-lg flex flex-col h-full
      `}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSidebarOpen(false); // إغلاق القائمة عند اختيار عنصر على الهواتف
          }} 
        />
      </div>
      
      {/* المحتوى الرئيسي */}
      <main className="flex-1 overflow-y-auto">
        {/* زر فتح القائمة للهواتف */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-3 sm:p-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-3 text-gray-700 hover:text-gray-900 bg-blue-50 px-4 py-4 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors duration-200 w-full"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="font-bold text-xl">القائمة الرئيسية</span>
          </button>
        </div>
        
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;