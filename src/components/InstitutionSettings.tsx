import React, { useState, useEffect } from 'react';
import { Building, MapPin, Calendar, Save, RefreshCw, CheckCircle, AlertCircle, School, Globe } from 'lucide-react';
import { dbManager } from '../utils/database';
import { InstitutionSettings as InstitutionSettingsType } from '../types';

const InstitutionSettings: React.FC = () => {
  const [settings, setSettings] = useState<InstitutionSettingsType>({
    academy: '',
    directorate: '',
    municipality: '',
    institution: '',
    academicYear: '2025/2026',
    updatedAt: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [lastImportData, setLastImportData] = useState<any>(null);

  useEffect(() => {
    loadInstitutionSettings();
  }, []);

  // عرض رسالة للمستخدم
  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  // تحميل إعدادات المؤسسة
  const loadInstitutionSettings = async () => {
    try {
      console.log('🔄 بدء تحميل إعدادات المؤسسة...');
      
      // محاولة جلب الإعدادات المحفوظة
      let institutionSettings = null;
      try {
        institutionSettings = await dbManager.getInstitutionSettings();
        console.log('📋 الإعدادات المحفوظة:', institutionSettings);
      } catch (error) {
        console.warn('⚠️ لا توجد إعدادات محفوظة، سيتم البحث في بيانات التلاميذ');
      }
      
      // إذا لم توجد إعدادات محفوظة، استخراج من آخر استيراد
      if (!institutionSettings) {
        console.log('🔍 البحث عن البيانات الوصفية في آخر استيراد...');
        const students = await dbManager.getStudents();
        
        if (students.length > 0) {
          // البحث عن آخر تلميذ مستورد مع بيانات وصفية كاملة
          const latestStudentWithMetadata = students
            .filter(s => s.region || s.province || s.municipality || s.institution)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          
          if (latestStudentWithMetadata) {
            console.log('✅ تم العثور على بيانات وصفية في:', latestStudentWithMetadata);
            setLastImportData(latestStudentWithMetadata);
            
            const extractedSettings = {
              academy: latestStudentWithMetadata.region || 'الأكاديمية الجهوية للتربية والتكوين',
              directorate: latestStudentWithMetadata.province || 'المديرية الإقليمية',
              municipality: latestStudentWithMetadata.municipality || 'الجماعة',
              institution: latestStudentWithMetadata.institution || 'المؤسسة التعليمية',
              academicYear: latestStudentWithMetadata.academicYear || '2025/2026',
              updatedAt: new Date().toISOString()
            };
            
            setSettings(extractedSettings);
            console.log('📊 تم استخراج الإعدادات ', extractedSettings);
          } else {
            console.log('⚠️ لا توجد بيانات وصفية في التلاميذ المستوردين');
          }
        } else {
          console.log('⚠️ لا توجد بيانات تلاميذ في قاعدة البيانات');
        }
      } else {
        setSettings(institutionSettings);
        console.log('✅ تم تحميل الإعدادات المحفوظة بنجاح');
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات المؤسسة:', error);
      showMessage('خطأ في تحميل إعدادات المؤسسة', 'error');
    } finally {
      setLoading(false);
    }
  };

  // حفظ إعدادات المؤسسة
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      console.log('💾 بدء حفظ إعدادات المؤسسة:', settings);
      
      await dbManager.saveInstitutionSettings({
        ...settings,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ تم حفظ الإعدادات بنجاح');
      showMessage('تم حفظ إعدادات المؤسسة بنجاح!', 'success');
    } catch (error) {
      console.error('خطأ في حفظ إعدادات المؤسسة:', error);
      showMessage('خطأ في حفظ إعدادات المؤسسة', 'error');
    } finally {
      setSaving(false);
    }
  };

  // تحديث حقل معين
  const updateField = (field: keyof InstitutionSettingsType, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // إعادة تحميل البيانات من آخر استيراد
  const reloadFromLastImport = async () => {
    try {
      setLoading(true);
      console.log('🔄 إعادة تحميل من آخر استيراد...');
      
      const students = await dbManager.getStudents();
      if (students.length > 0) {
        // البحث عن آخر تلميذ مع بيانات وصفية كاملة
        const studentsWithMetadata = students.filter(s => 
          s.region || s.province || s.municipality || s.institution
        );
        
        if (studentsWithMetadata.length === 0) {
          showMessage('لا توجد بيانات وصفية في أي من التلاميذ المستوردين', 'error');
          return;
        }
        
        const latestStudent = studentsWithMetadata.reduce((latest, student) => 
          new Date(student.createdAt) > new Date(latest.createdAt) ? student : latest
        );
        
        console.log('📊 آخر تلميذ مع بيانات وصفية:', latestStudent);
        
        const updatedSettings = {
          academy: latestStudent.region || settings.academy,
          directorate: latestStudent.province || settings.directorate,
          municipality: latestStudent.municipality || settings.municipality,
          institution: latestStudent.institution || settings.institution,
          academicYear: latestStudent.academicYear || settings.academicYear,
          updatedAt: new Date().toISOString()
        };
        
        setSettings(updatedSettings);
        setLastImportData(latestStudent);
        
        console.log('✅ تم تحديث الإعدادات ', updatedSettings);
        showMessage('تم تحديث البيانات من آخر استيراد بنجاح!', 'success');
      } else {
        showMessage('لا توجد بيانات تلاميذ للتحديث منها', 'error');
      }
    } catch (error) {
      console.error('خطأ في إعادة التحميل:', error);
      showMessage('خطأ في إعادة التحميل من آخر استيراد', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">جاري تحميل إعدادات المؤسسة...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="p-6 max-w-4xl mx-auto">
        {/* عنوان الصفحة */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            إعدادات المؤسسة
          </h1>
          <p className="text-gray-600 text-lg">إدارة البيانات الأساسية للمؤسسة التعليمية</p>
          <div className="mt-4 w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto"></div>
        </div>

        {/* عرض الرسائل */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message}
          </div>
        )}

        {/* عرض البيانات المستخرجة من آخر استيراد */}
        {lastImportData && (
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">البيانات المستخرجة من آخر استيراد</h3>
                <p className="text-blue-700 text-sm">تم استخراج هذه البيانات من التلميذ: {lastImportData.firstName} {lastImportData.lastName}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><strong className="text-blue-800">الأكاديمية:</strong> <span className="text-gray-700">{lastImportData.region || 'غير محدد'}</span></p>
                <p><strong className="text-blue-800">المديرية:</strong> <span className="text-gray-700">{lastImportData.province || 'غير محدد'}</span></p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-blue-800">الجماعة:</strong> <span className="text-gray-700">{lastImportData.municipality || 'غير محدد'}</span></p>
                <p><strong className="text-blue-800">المؤسسة:</strong> <span className="text-gray-700">{lastImportData.institution || 'غير محدد'}</span></p>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-blue-600">
              <p>تاريخ الاستيراد: {new Date(lastImportData.createdAt).toLocaleString('ar-EG')}</p>
              <p>السنة الدراسية: {lastImportData.academicYear}</p>
            </div>
          </div>
        )}
        {/* أزرار التحكم */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">بيانات المؤسسة</h2>
                <p className="text-sm text-gray-600">آخر تحديث: {new Date(settings.updatedAt).toLocaleString('ar-EG')}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={reloadFromLastImport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                تحديث من آخر استيراد
              </button>
              
            {/*     <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button> */}
            </div>
          </div>
        </div>

        {/* نموذج الإعدادات */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* الأكاديمية الجهوية */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <label className="block text-sm font-medium text-blue-900">
                    الأكاديمية الجهوية للتربية والتكوين
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.academy}
                  onChange={(e) => updateField('academy', e.target.value)}
                  placeholder="مثال: أكاديمية الرباط سلا القنيطرة"
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                {lastImportData?.region && (
                  <p className="text-xs text-blue-600 mt-1">
                     {lastImportData.region}
                  </p>
                )}
              
              </div>

              {/* المديرية الإقليمية */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="w-5 h-5 text-green-600" />
                  <label className="block text-sm font-medium text-green-900">
                    المديرية الإقليمية
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.directorate}
                  onChange={(e) => updateField('directorate', e.target.value)}
                  placeholder="مثال: المديرية الإقليمية للرباط"
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                />
                {lastImportData?.province && (
                  <p className="text-xs text-green-600 mt-1">
                     {lastImportData.province}
                  </p>
                )}
            
              </div>

              {/* الجماعة */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <label className="block text-sm font-medium text-purple-900">
                    الجماعة
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.municipality}
                  onChange={(e) => updateField('municipality', e.target.value)}
                  placeholder="مثال: جماعة أكدال الرياض"
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                />
                {lastImportData?.municipality && (
                  <p className="text-xs text-purple-600 mt-1">
                     {lastImportData.municipality}
                  </p>
                )}
                 
              </div>

              {/* المؤسسة */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <School className="w-5 h-5 text-orange-600" />
                  <label className="block text-sm font-medium text-orange-900">
                    المؤسسة التعليمية
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                  placeholder="مثال: ثانوية الحسن الثاني التأهيلية"
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                />
                {lastImportData?.institution && (
                  <p className="text-xs text-orange-600 mt-1">
                     {lastImportData.institution}
                  </p>
                )}
             
              </div>

              {/* السنة الدراسية */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 md:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <label className="block text-sm font-medium text-indigo-900">
                    السنة الدراسية الحالية
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.academicYear}
                  onChange={(e) => updateField('academicYear', e.target.value)}
                  placeholder="مثال: 2025/2026"
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                />
                {lastImportData?.academicYear && (
                  <p className="text-xs text-indigo-600 mt-1">
                     {lastImportData.academicYear}
                  </p>
                )}
             
              </div>
            </div>

            {/* معاينة البيانات */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">معاينة البيانات المحفوظة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong className="text-blue-800">الأكاديمية:</strong> <span className="text-gray-700">{settings.academy || 'غير محدد'}</span></p>
                  <p><strong className="text-green-800">المديرية:</strong> <span className="text-gray-700">{settings.directorate || 'غير محدد'}</span></p>
                  <p><strong className="text-purple-800">الجماعة:</strong> <span className="text-gray-700">{settings.municipality || 'غير محدد'}</span></p>
                </div>
                <div className="space-y-2">
                  <p><strong className="text-orange-800">المؤسسة:</strong> <span className="text-gray-700">{settings.institution || 'غير محدد'}</span></p>
                  <p><strong className="text-indigo-800">السنة الدراسية:</strong> <span className="text-gray-700">{settings.academicYear}</span></p>
                  <p><strong className="text-gray-800">آخر تحديث:</strong> <span className="text-gray-700">{new Date(settings.updatedAt).toLocaleDateString('ar-EG')}</span></p>
                </div>
              </div>
            </div>
            
            {/* إحصائيات التلاميذ المرتبطين بهذه البيانات */}
            <StudentStatsByInstitution settings={settings} />
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">معلومات مهمة</h3>
          <div className="space-y-2 text-blue-800">
            <p>• <strong>التحديث التلقائي:</strong> يتم تحديث هذه البيانات تلقائياً عند استيراد لوائح التلاميذ</p>
            <p>• <strong>استخراج من Excel:</strong> البيانات تُستخرج من الخلايا المحددة في ملفات Excel</p>
            <p>• <strong>استخدام في التقارير:</strong> هذه البيانات تظهر في جميع التقارير والإحصائيات</p>
            <p>• <strong>التحديث اليدوي:</strong> يمكنك تعديل البيانات يدوياً إذا لزم الأمر</p>
            <p>• <strong>إعادة التحميل:</strong> استخدم زر "تحديث من آخر استيراد" لاستعادة البيانات من آخر ملف مستورد</p>
            <p>• <strong>الحفظ الآمن:</strong> يتم حفظ البيانات في جدول منفصل مع التحقق من الأخطاء</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// مكون عرض إحصائيات التلاميذ المرتبطين ببيانات المؤسسة
const StudentStatsByInstitution: React.FC<{ settings: InstitutionSettingsType }> = ({ settings }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [settings]);

  const loadStats = async () => {
    try {
      const students = await dbManager.getStudents();
      
      // فلترة التلاميذ المرتبطين بهذه المؤسسة
      const relatedStudents = students.filter(s => 
        s.academicYear === settings.academicYear &&
        (s.institution === settings.institution || 
         s.region === settings.academy ||
         s.province === settings.directorate ||
         s.municipality === settings.municipality)
      );
      
      const activeStudents = relatedStudents.filter(s => s.status === 'متمدرس');
      
      setStats({
        total: relatedStudents.length,
        active: activeStudents.length,
        male: activeStudents.filter(s => s.gender === 'ذكر').length,
        female: activeStudents.filter(s => s.gender === 'أنثى').length,
        levels: [...new Set(activeStudents.map(s => s.level).filter(Boolean))].length,
        sections: [...new Set(activeStudents.map(s => s.section).filter(Boolean))].length
      });
    } catch (error) {
      console.error('خطأ في تحميل إحصائيات المؤسسة:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800">لا توجد بيانات تلاميذ مرتبطة بهذه المؤسسة</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
      <h3 className="text-lg font-semibold text-green-900 mb-4">إحصائيات التلاميذ المرتبطين</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg text-center border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">إجمالي التلاميذ</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-center border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">المتمدرسين</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-center border border-gray-200">
          <div className="text-2xl font-bold text-indigo-600">{stats.male}</div>
          <div className="text-sm text-gray-600">الذكور</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-center border border-gray-200">
          <div className="text-2xl font-bold text-pink-600">{stats.female}</div>
          <div className="text-sm text-gray-600">الإناث</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-center border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{stats.levels}</div>
          <div className="text-sm text-gray-600">المستويات</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-center border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{stats.sections}</div>
          <div className="text-sm text-gray-600">الأقسام</div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-green-700">
        <p>هذه الإحصائيات للتلاميذ المرتبطين ببيانات هذه المؤسسة للسنة الدراسية {settings.academicYear}</p>
      </div>
    </div>
  );
};
export default InstitutionSettings;