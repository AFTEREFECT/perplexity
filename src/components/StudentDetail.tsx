import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { Student, AttendanceRecord, GradeRecord } from '../types';

 

interface StudentDetailProps {
  student: Student;
  onClose: () => void;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ student, onClose }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const [attendance, grades] = await Promise.all([
          dbManager.getAttendanceRecords(student.id),
          dbManager.getGradeRecords(student.id)
        ]);
        setAttendanceRecords(attendance);
        setGradeRecords(grades);
      } catch (error) {
        console.error('خطأ في تحميل بيانات الطالب:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [student.id]);

  // حساب معدل الحضور
  const calculateAttendanceRate = () => {
    if (attendanceRecords.length === 0) return 0;
    const presentCount = attendanceRecords.filter(record => record.status === 'حاضر').length;
    return Math.round((presentCount / attendanceRecords.length) * 100);
  };

  // حساب متوسط الدرجات
  const calculateAverageGrade = () => {
    if (gradeRecords.length === 0) return 0;
    const totalGrade = gradeRecords.reduce((sum, record) => sum + (record.grade / record.maxGrade) * 100, 0);
    return Math.round(totalGrade / gradeRecords.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            تفاصيل الطالب
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* معلومات الطالب */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-gray-600">الرقم الجامعي: {student.studentId}</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  student.status === 'نشط' ? 'bg-green-100 text-green-800' :
                  student.status === 'غير نشط' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {student.status}
                </span>
              </div>
            </div>

            {/* شبكة المعلومات */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">البريد الإلكتروني</span>
                </div>
                <p className="text-gray-600">{student.email || 'غير محدد'}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">رقم الهاتف</span>
                </div>
                <p className="text-gray-600">{student.phone || 'غير محدد'}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">تاريخ الميلاد</span>
                </div>
                <p className="text-gray-600">
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-CA') : 'غير محدد'}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">الصف</span>
                </div>
                <p className="text-gray-600">{student.grade || 'غير محدد'}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">تاريخ التسجيل</span>
                </div>
                <p className="text-gray-600">
                  {new Date(student.enrollmentDate).toLocaleDateString('en-CA')}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">جهة اتصال الطوارئ</span>
                </div>
                <p className="text-gray-600">{student.emergencyContact || 'غير محدد'}</p>
                <p className="text-gray-600 text-sm">{student.emergencyPhone || ''}</p>
              </div>
            </div>

            {/* العنوان */}
            {student.address && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">العنوان</span>
                </div>
                <p className="text-gray-600">{student.address}</p>
              </div>
            )}
          </div>

          {/* الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">معلومات التلميذ</h4>
              <p className="text-2xl font-bold text-blue-600">متاح</p>
              <p className="text-sm text-blue-600">جميع البيانات الأساسية</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">حالة التلميذ</h4>
              <p className="text-2xl font-bold text-green-600">{student.status}</p>
              <p className="text-sm text-green-600">الحالة الحالية</p>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">ملاحظات</h4>
            <p className="text-gray-700">
              {student.notes || 'لا توجد ملاحظات إضافية لهذا التلميذ.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;