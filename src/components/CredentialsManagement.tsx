import React, { useState, useEffect } from 'react';
import { Key, Search, Download, Upload, Edit, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { dbManager } from '../utils/database';
import { Student } from '../types';

interface Credential {
  student_id: string;
  secret_code: string;
  issue_date: string;
}

interface CredentialWithStudent extends Credential {
  studentName: string;
  studentGrade: string;
  studentSection: string;
}

const CredentialsManagement: React.FC = () => {
  const [credentials, setCredentials] = useState<CredentialWithStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredCredentials, setFilteredCredentials] = useState<CredentialWithStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('الكل');
  const [sectionFilter, setSectionFilter] = useState<string>('الكل');
  const [loading, setLoading] = useState(true);
  const [showCodes, setShowCodes] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<CredentialWithStudent | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    secret_code: '',
    issue_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCredentials();
  }, [credentials, searchTerm, gradeFilter, sectionFilter]);

  // تحميل البيانات
  const loadData = async () => {
    try {
      const [credentialsData, studentsData] = await Promise.all([
        dbManager.getCredentials(),
        dbManager.getStudents()
      ]);

      setStudents(studentsData);

      // ربط الأكواد السرية بمعلومات التلاميذ
      const credentialsWithStudents = credentialsData.map(credential => {
        const student = studentsData.find(s => s.studentId === credential.student_id);
        return {
          ...credential,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'تلميذ غير معروف',
          studentGrade: student?.grade || '',
          studentSection: student?.section || ''
        };
      });

      setCredentials(credentialsWithStudents);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  // تصفية الأكواد السرية
  const filterCredentials = () => {
    let filtered = [...credentials];

    if (searchTerm) {
      filtered = filtered.filter(credential =>
        credential.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        credential.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        credential.secret_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (gradeFilter !== 'الكل') {
      filtered = filtered.filter(credential => credential.studentGrade === gradeFilter);
    }

    if (sectionFilter !== 'الكل') {
      filtered = filtered.filter(credential => credential.studentSection === sectionFilter);
    }

    setFilteredCredentials(filtered);
  };

  // إضافة أو تحديث كود سري
  const handleSaveCredential = async () => {
    try {
      await dbManager.addOrUpdateCredential(formData);
      await loadData();
      setShowForm(false);
      setSelectedCredential(null);
      setFormData({
        student_id: '',
        secret_code: '',
        issue_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('خطأ في حفظ الكود السري:', error);
      alert('خطأ في حفظ الكود السري: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    }
  };

  // حذف كود سري
  const handleDeleteCredential = async (studentId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الكود السري؟')) {
      try {
        await dbManager.deleteCredential(studentId);
        await loadData();
      } catch (error) {
        console.error('خطأ في حذف الكود السري:', error);
      }
    }
  };

  // تصدير الأكواد السرية
  const handleExportCredentials = () => {
    const dataToExport = filteredCredentials.map((credential, index) => ({
      'رت': index + 1,
      'رقم التلميذ': credential.student_id,
      'اسم التلميذ': credential.studentName,
      'الصف': credential.studentGrade,
      'القسم': credential.studentSection,
      'الكود السري': credential.secret_code,
      'تاريخ الإصدار': credential.issue_date
    }));

    // إنشاء ملف CSV
    const csvContent = [
      Object.keys(dataToExport[0]).join(','),
      ...dataToExport.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `الأكواد_السرية_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // الحصول على الصفوف الفريدة
  const getUniqueGrades = () => {
    return Array.from(new Set(students.map(s => s.grade).filter(Boolean)));
  };

  // الحصول على الأقسام الفريدة
  const getUniqueSections = () => {
    return Array.from(new Set(students.map(s => s.section).filter(Boolean)));
  };

  // توليد كود سري عشوائي
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, secret_code: result }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* عنوان الصفحة */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            إدارة الأكواد السرية
          </h1>
          <p className="text-gray-600 text-lg">إدارة الأكواد السرية للتلاميذ وتتبع صلاحياتها</p>
          <div className="mt-4 w-24 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mx-auto"></div>
        </div>

        {/* شريط الأدوات */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {/* البحث */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="البحث في الأكواد السرية..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-64"
                />
              </div>
              
              {/* تصفية الصف */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="الكل">جميع الصفوف</option>
                {getUniqueGrades().map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              
              {/* تصفية القسم */}
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="الكل">جميع الأقسام</option>
                {getUniqueSections().map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
            
            {/* أزرار الإجراءات */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCodes(!showCodes)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                  showCodes 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
                }`}
              >
                {showCodes ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {showCodes ? 'إخفاء الأكواد' : 'إظهار الأكواد'}
              </button>
              
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5" />
                إضافة كود سري
              </button>
              
              <button
                onClick={handleExportCredentials}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Download className="w-5 h-5" />
                تصدير CSV
              </button>
            </div>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">إجمالي الأكواد</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{credentials.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Search className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">النتائج المفلترة</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{filteredCredentials.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-700">الصفوف المختلفة</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{getUniqueGrades().length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-700">الأقسام المختلفة</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{getUniqueSections().length}</p>
          </div>
        </div>

        {/* جدول الأكواد السرية */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التلميذ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم التلميذ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الصف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    القسم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الكود السري
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الإصدار
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCredentials.map((credential) => (
                  <tr key={credential.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {credential.studentName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {credential.student_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {credential.studentGrade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {credential.studentSection}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono ${showCodes ? 'text-gray-900' : 'text-gray-400'}`}>
                          {showCodes ? credential.secret_code : '••••••••'}
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          سري
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(credential.issue_date).toLocaleDateString('en-CA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCredential(credential);
                            setFormData({
                              student_id: credential.student_id,
                              secret_code: credential.secret_code,
                              issue_date: credential.issue_date
                            });
                            setShowForm(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCredential(credential.student_id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredCredentials.length === 0 && (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد أكواد سرية</p>
            </div>
          )}
        </div>
      </div>

      {/* نموذج إضافة/تعديل كود سري */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCredential ? 'تعديل الكود السري' : 'إضافة كود سري جديد'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedCredential(null);
                  setFormData({
                    student_id: '',
                    secret_code: '',
                    issue_date: new Date().toISOString().split('T')[0]
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* اختيار التلميذ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التلميذ *
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  disabled={!!selectedCredential}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">اختر التلميذ</option>
                  {students.map(student => (
                    <option key={student.id} value={student.nationalId}>
                      {student.firstName} {student.lastName} - {student.nationalId}
                    </option>
                  ))}
                </select>
              </div>

              {/* الكود السري */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الكود السري *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.secret_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret_code: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="أدخل الكود السري"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                  >
                    توليد
                  </button>
                </div>
              </div>

              {/* تاريخ الإصدار */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الإصدار *
                </label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* أزرار التحكم */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSaveCredential}
                  disabled={!formData.student_id || !formData.secret_code}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {selectedCredential ? 'تحديث الكود' : 'إضافة الكود'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedCredential(null);
                    setFormData({
                      student_id: '',
                      secret_code: '',
                      issue_date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialsManagement;