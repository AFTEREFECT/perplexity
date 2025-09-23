import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, UserCheck, User, Heart, Bus, Plus, FileSpreadsheet, Upload, Download, Target, Key, BarChart3, Trash2, AlertTriangle, Database, CheckCircle } from 'lucide-react';
import { dbManager } from '../utils/database';
import { DatabaseStats } from '../types';
import ProgressBar from './ProgressBar';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats>({
    totalStudents: 0,
    activeStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    totalAttendanceRecords: 0,
    totalGradeRecords: 0,
    averageGrade: 0,
    attendanceRate: 0,
    socialSupportCount: 0,
    transportServiceCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  const [progressData, setProgressData] = useState({
    progress: 0,
    status: 'idle' as 'loading' | 'success' | 'error' | 'idle',
    message: '',
    estimatedTime: 0,
    details: null as any
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // جلب السنة الدراسية الحالية
        const academicYear = await dbManager.getCurrentAcademicYear();
        setCurrentAcademicYear(academicYear);
        
        // جلب الإحصائيات للسنة الحالية
        const dbStats = await dbManager.getDatabaseStats(academicYear);
        setStats(dbStats);
      } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        // تعيين إحصائيات فارغة في حالة الخطأ
        setStats({
          totalStudents: 0,
          activeStudents: 0,
          maleStudents: 0,
          femaleStudents: 0,
          totalAttendanceRecords: 0,
          totalGradeRecords: 0,
          averageGrade: 0,
          attendanceRate: 0,
          socialSupportCount: 0,
          transportServiceCount: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // مكون بطاقة الإحصائيات
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    description: string;
    trend?: number;
    onClick?: () => void;
  }> = ({ title, value, icon, color, description }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200 cursor-pointer group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
      <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color.replace('bg-', 'bg-').replace('-500', '-400')} transition-all duration-1000 ease-out`} 
             style={{ width: '75%' }}></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="p-6 max-w-7xl mx-auto">
      {/* عنوان الصفحة */}
      <div className="mb-6 lg:mb-8 text-center px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 lg:mb-3">
          لوحة التحكم
        </h1>
        <p className="text-gray-600 text-sm sm:text-base lg:text-lg">نظرة عامة شاملة على نظام إدارة التلاميذ</p>
        <div className="mt-4 w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto"></div>
      </div>

      {/* زر تهيئة قاعدة البيانات */}
      <div className="mb-8 flex justify-end">
        <DatabaseResetButton />
      </div>

      {/* شريط التقدم */}
      {progressData.status !== 'idle' && (
        <div className="mb-8">
          <ProgressBar
            progress={progressData.progress}
            status={progressData.status}
            message={progressData.message}
            estimatedTime={progressData.estimatedTime}
            details={progressData.details}
          />
        </div>
      )}

      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 lg:mb-6 flex items-center gap-3 px-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          الإحصائيات الرئيسية
        </h2>
      
      {/* زر تهيئة قاعدة البيانات 
      <div className="mb-8 flex justify-start">
        <DatabaseResetButton />
      </div>
*/}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8 px-4">
        <StatCard
          title="التلاميذ المتمدرسين"
          value={stats.totalStudents}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          description={`المتمدرسين (شامل الوافدين والمدمجين) في الموسم ${currentAcademicYear}`}
        />
        
        <StatCard
          title="التلاميذ النشطون"
          value={stats.activeStudents}
          icon={<UserCheck className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-green-500 to-green-600"
          description={`النشطون (متمدرسين فعلياً) في الموسم ${currentAcademicYear}`}
        />
        
        <StatCard
          title="التلاميذ الذكور"
          value={stats.maleStudents}
          icon={<User className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-indigo-500 to-indigo-600"
          description={`الذكور المتمدرسين (شامل الوافدين والمدمجين) في ${currentAcademicYear}`}
        />
        
        <StatCard
          title="التلميذات الإناث"
          value={stats.femaleStudents}
          icon={<User className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-pink-500 to-pink-600"
          description={`الإناث المتمدرسات (شامل الوافدات والمدمجات) في ${currentAcademicYear}`}
        />
      </div>
      </div>


      {/* الوضعية الحالية */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          الوضعية الحالية
        </h2>
        <CurrentStatusSection currentAcademicYear={currentAcademicYear} />
      </div>


        
      {/* بطاقات الإحصائيات الأكاديمية */}

      {/* بطاقات الخدمات */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-emerald-600" />
          </div>
          الخدمات والدعم
        </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="الأكواد السرية"
          value="متاح"
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          description="نظام الأكواد السرية للتلاميذ"
        />
        
        <StatCard
          title="الدعم الاجتماعي"
          value={stats.socialSupportCount}
          icon={<Heart className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-red-500 to-red-600"
          description="المستفيدون من الدعم الاجتماعي"
        />
        
        <StatCard
          title="خدمة النقل"
          value={stats.transportServiceCount}
          icon={<Bus className="w-6 h-6 text-white" />}
          color="bg-gradient-to-r from-yellow-500 to-yellow-600"
          description="المستفيدون من خدمة النقل"
        />
      </div>
      </div>

      {/* الأقسام الإضافية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الإجراءات السريعة */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            الإجراءات السريعة
          </h2>
          <div className="space-y-3">
            <button className="w-full text-right p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all duration-300 border border-blue-200 hover:border-blue-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">إضافة تلميذ جديد</h3>
                  <p className="text-sm text-blue-600">تسجيل تلميذ جديد في النظام</p>
                </div>
              </div>
            </button>
            <button className="w-full text-right p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all duration-300 border border-green-200 hover:border-green-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">إدارة الأكواد السرية</h3>
                  <p className="text-sm text-green-600">إدارة أكواد التلاميذ</p>
                </div>
              </div>
            </button>
            <button className="w-full text-right p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all duration-300 border border-purple-200 hover:border-purple-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900">إدارة التوجيه</h3>
                  <p className="text-sm text-purple-600">توليد قرارات التوجيه</p>
                </div>
              </div>
            </button>
            <button className="w-full text-right p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl transition-all duration-300 border border-orange-200 hover:border-orange-300 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900">استيراد لوائح التلاميذ</h3>
                  <p className="text-sm text-orange-600">استيراد بيانات من ملفات Excel</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* النشاط الأخير */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            النشاط الأخير
          </h2>
          <div className="space-y-3">
            <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="w-3 h-3 bg-blue-500 rounded-full ml-3 animate-pulse"></div>
              <div>
                <p className="text-sm font-semibold text-blue-900">تم تهيئة قاعدة البيانات</p>
                <p className="text-xs text-blue-600">النظام جاهز للاستخدام</p>
              </div>
            </div>
            {stats.totalStudents > 0 && (
              <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full ml-3"></div>
                <div>
                  <p className="text-sm font-semibold text-green-900">تم تحميل لوائح التلاميذ</p>
                  <p className="text-xs text-green-600">{stats.totalStudents} تلميذ في النظام</p>
                </div>
              </div>
            )}
            {stats.maleStudents > 0 && stats.femaleStudents > 0 && (
              <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="w-3 h-3 bg-purple-500 rounded-full ml-3"></div>
                <div>
                  <p className="text-sm font-semibold text-purple-900">توزيع التلاميذ حسب النوع</p>
                  <p className="text-xs text-purple-600">
                    {stats.maleStudents} ذكور، {stats.femaleStudents} إناث
                  </p>
                </div>
              </div>
            )}
            {stats.socialSupportCount > 0 && (
              <div className="flex items-center p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
                <div className="w-3 h-3 bg-red-500 rounded-full ml-3"></div>
                <div>
                  <p className="text-sm font-semibold text-red-900">خدمات الدعم الاجتماعي</p>
                  <p className="text-xs text-red-600">{stats.socialSupportCount} تلميذ مستفيد</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

// مكون زر تهيئة قاعدة البيانات
const DatabaseResetButton: React.FC = () => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const handleReset = async () => {
    setLoading(true);
    setStep(1);
    
    try {
      // محاكاة خطوات التهيئة
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep(2);
      
      await dbManager.clearDatabase();
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep(3);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep(4);
      
      // إعادة تحميل الصفحة بعد التهيئة
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('خطأ في تهيئة قاعدة البيانات:', error);
      setLoading(false);
      setShowConfirmModal(false);
      alert('حدث خطأ في تهيئة قاعدة البيانات');
    }
  };

  const resetSteps = [
    'جاري التحضير...',
    'جاري مسح البيانات...',
    'جاري إعادة تهيئة الجداول...',
    'تم بنجاح! جاري إعادة التحميل...'
  ];

  return (
    <>
      <button
        onClick={() => setShowConfirmModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <Database className="w-5 h-5" />
        <span className="font-medium">تهيئة قاعدة البيانات</span>
      </button>

      {/* مودال التأكيد */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {!loading ? (
              <>
                {/* رأس المودال */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white text-center">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">تهيئة قاعدة البيانات</h3>
                  <p className="text-red-100">هذا الإجراء سيحذف جميع البيانات نهائياً</p>
                </div>

                {/* محتوى المودال */}
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-900">تحذير مهم</span>
                    </div>
                    <div className="text-red-800 text-sm space-y-1">
                      <p>• سيتم حذف جميع بيانات التلاميذ</p>
                      <p>• سيتم حذف جميع المستويات والأقسام</p>
                      <p>• سيتم حذف جميع الأكواد السرية</p>
                      <p>• سيتم حذف جميع بيانات الحركية</p>
                      <p>• <strong>هذا الإجراء لا يمكن التراجع عنه</strong></p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">ما سيحدث:</span>
                    </div>
                    <div className="text-blue-800 text-sm space-y-1">
                      <p>✓ مسح جميع الجداول</p>
                      <p>✓ إعادة إنشاء هيكل قاعدة البيانات</p>
                      <p>✓ إعادة تحميل النظام</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold"
                    >
                      نعم، تهيئة قاعدة البيانات
                    </button>
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-semibold"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* مودال التقدم */
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Database className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">جاري تهيئة قاعدة البيانات</h3>
                
                <div className="space-y-4">
                  {resetSteps.map((stepText, index) => (
                    <div key={index} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                      index < step ? 'bg-green-50 border border-green-200' :
                      index === step ? 'bg-blue-50 border border-blue-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        index < step ? 'bg-green-500' :
                        index === step ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`}>
                        {index < step ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : index === step ? (
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        ) : (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${
                        index < step ? 'text-green-800' :
                        index === step ? 'text-blue-800' :
                        'text-gray-600'
                      }`}>
                        {stepText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// مكون الوضعية الحالية
const CurrentStatusSection: React.FC<{ currentAcademicYear: string }> = ({ currentAcademicYear }) => {
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentStatus = async () => {
      try {
        // جلب إحصائيات البنية التربوية للسنة الحالية
        const students = await dbManager.getStudentsByAcademicYear(currentAcademicYear);
        const activeStudents = students.filter(s => s.status === 'متمدرس');
        
        // تجميع البيانات حسب المستوى
        const levelStats = new Map<string, { total: number; male: number; female: number }>();
        
        activeStudents.forEach(student => {
          const level = student.level || 'غير محدد';
          if (!levelStats.has(level)) {
            levelStats.set(level, { total: 0, male: 0, female: 0 });
          }
          
          const stats = levelStats.get(level)!;
          stats.total++;
          if (student.gender === 'ذكر') {
            stats.male++;
          } else {
            stats.female++;
          }
        });
        
        // تحويل إلى مصفوفة مرتبة
        const sortedLevels = Array.from(levelStats.entries())
          .map(([level, data]) => ({ level, ...data }))
          .sort((a, b) => b.total - a.total);
        
        setCurrentStats({
          totalStudents: activeStudents.length,
          totalMale: activeStudents.filter(s => s.gender === 'ذكر').length,
          totalFemale: activeStudents.filter(s => s.gender === 'أنثى').length,
          levels: sortedLevels,
          date: new Date().toLocaleDateString('ar-EG')
        });
      } catch (error) {
        console.error('خطأ في تحميل الوضعية الحالية:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentStatus();
  }, [currentAcademicYear]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStats) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500">لا توجد بيانات للوضعية الحالية</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* عنوان الوضعية */}
      <div className="text-center mb-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-lg mb-4">
          <h3 className="text-xl font-bold mb-2">الوضعية الحالية</h3>
          <p className="text-indigo-100">وضعية: {currentStats.date} | السنة الدراسية: {currentAcademicYear}</p>
        </div>
      </div>

      {/* الإحصائيات الإجمالية */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">{currentStats.totalStudents}</div>
          <div className="text-sm text-green-800 font-medium">المجموع</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
          <div className="text-2xl font-bold text-red-600">{currentStats.totalFemale}</div>
          <div className="text-sm text-red-800 font-medium">الإناث</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{currentStats.totalMale}</div>
          <div className="text-sm text-blue-800 font-medium">الذكور</div>
        </div>
      </div>

      {/* جدول المستويات */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-right font-bold text-gray-700">المستوى</th>
              <th className="px-4 py-2 text-center font-bold text-blue-700">ذكور</th>
              <th className="px-4 py-2 text-center font-bold text-red-700">إناث</th>
              <th className="px-4 py-2 text-center font-bold text-green-700">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {currentStats.levels.map((level: any, index: number) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-25' : 'bg-white'}>
                <td className="px-4 py-2 font-medium text-gray-900 text-right">{level.level}</td>
                <td className="px-4 py-2 text-center font-bold text-blue-600">{level.male}</td>
                <td className="px-4 py-2 text-center font-bold text-red-600">{level.female}</td>
                <td className="px-4 py-2 text-center font-bold text-green-600">{level.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مبيان بسيط */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h4 className="text-center font-bold text-gray-800 mb-4">التوزيع حسب المستويات</h4>
        <div className="flex justify-center items-end gap-2 h-32">
          {currentStats.levels.slice(0, 5).map((level: any, index: number) => {
            const maxHeight = Math.max(...currentStats.levels.map((l: any) => l.total));
            const height = (level.total / maxHeight) * 100;
            
            return (
              <div key={index} className="flex flex-col items-center">
                <div className="flex gap-1 items-end">
                  <div 
                    className="bg-green-500 rounded-t"
                    style={{ height: `${height}px`, width: '20px' }}
                    title={`المجموع: ${level.total}`}
                  ></div>
                  <div 
                    className="bg-red-500 rounded-t"
                    style={{ height: `${(level.female / maxHeight) * 100}px`, width: '15px' }}
                    title={`الإناث: ${level.female}`}
                  ></div>
                  <div 
                    className="bg-blue-500 rounded-t"
                    style={{ height: `${(level.male / maxHeight) * 100}px`, width: '15px' }}
                    title={`الذكور: ${level.male}`}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-2 text-center max-w-16 truncate">
                  {level.level.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* مفتاح الألوان */}
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>الذكور</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>الإناث</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>المجموع</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;