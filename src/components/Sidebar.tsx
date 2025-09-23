import React from 'react';
import { 
  Home, 
  Users, 
  Settings, 
  Database,
  ChevronLeft,
  BarChart3,
  FileText,
  FileSpreadsheet,
  Key,
  Search,
  Target, 
  BarChart2,
  Award,
  Link2,
  Layers,
  Building,
  Calculator,
  Scan,
  Smartphone
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  // عناصر القائمة الجانبية
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
    { id: 'students', label: 'إدارة التلاميذ', icon: Users },
  //  { id: 'levels-setup', label: 'إعداد المستويات والأقسام', icon: Layers },
    { id: 'comprehensive-import', label: 'استيراد اللوائح والمستويات والأقسام', icon: FileSpreadsheet },
    { id: 'educational-structure', label: 'البنية التربوية للمؤسسة', icon: BarChart3 },

    { id: 'school-entry-overview', label: 'تتبع الدخول المدرسي', icon: Calculator },
  //  { id: 'enrollment', label: 'استيراد الدخول المدرسي', icon: FileSpreadsheet },
   
   // { id: 'council-decisions', label: 'استيراد محاضر الأقسام', icon: FileText },
   // { id: 'guidance', label: 'إدارة التوجيه', icon: Target },
   // { id: 'guidance-analysis', label: 'تحليل بيانات التوجيه', icon: BarChart2 },
    { id: 'student-mobility', label: 'إدارة حركية التلاميذ', icon: Users },
    { id: 'file-management', label: 'تدبير ملفات الوافدين والمغادرين', icon: FileText },
    { id: 'incoming-students', label: 'تدبير التلاميذ الوافدين', icon: Users },
   { id: 'credentials-import', label: 'استيراد الأكواد السرية', icon: Key },
    { id: 'credentials', label: 'إدارة الأكواد السرية', icon: Key },
    { id: 'quiz-management', label: 'نظام الروائز', icon: Scan },
    { id: 'qr-generator', label: 'QR Code للموبايل', icon: Smartphone },
    { id: 'printable-reports', label: 'التقارير القابلة للطباعة', icon: FileText },
   // { id: 'database-relationships', label: 'إدارة العلاقات بين الجداول', icon: Link2 },
 //  { id: 'reports', label: 'التقارير المتقدمة', icon: FileText },
  { id: 'data-verification', label: 'تحليل وتحقق البيانات', icon: Search },
 //   { id: 'sql-tool', label: 'أداة استعلام SQL', icon: Database },
   { id: 'institution-settings', label: 'إعدادات المؤسسة', icon: Building },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="w-full h-full bg-white shadow-lg flex flex-col overflow-hidden">
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {/* شعار النظام */}
        <div className="flex items-center gap-2 mb-6">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">نظام إدارة التلاميذ</h1>
        </div>
        
        {/* قائمة التنقل */}
        <nav className="space-y-1 sm:space-y-2 pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-right transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="font-medium text-sm sm:text-base leading-tight">{item.label}</span>
                {isActive && <ChevronLeft className="w-4 h-4 mr-auto" />}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* معلومات النظام - في الأسفل */}
      <div className="p-3 sm:p-4 border-t bg-gray-50 flex-shrink-0">
        <div className="text-sm sm:text-base text-gray-500 text-center space-y-1">
          <p>تخزين محلي فقط</p>
          <p>لا توجد خوادم خارجية</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;