import React, { useState, useEffect } from 'react';
import { X, Send, Download, Building, User, Calendar, FileText, AlertCircle, CheckCircle, Plus, Trash2, MapPin, Globe } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { dbManager } from '../utils/database';
import ServiceManager, { DEFAULT_SERVICES } from '../utils/serviceManager';
import { correspondenceReminder } from '../utils/correspondenceReminder';

interface IncomingStudent {
  id: string;
  studentId: string;
  lastName: string;
  firstName: string;
  transferDate: string;
  transferType: string;
  originalInstitution: string;
  originalDirectorate: string;
  originalAcademy: string;
  academy: string;
  directorate: string;
  level: string;
  municipality: string;
  institution: string;
  academicYear: string;
  fileStatus: 'لم يتم الإرسال' | 'طلب مرسل' | 'ملف تم التوصل به' | 'مكرر' | 'غير معروف';
  requestCount: number;
  requestDates: string[];
  lastRequestDate?: string;
  notes: string;
  linkedGender?: 'ذكر' | 'أنثى' | 'غير محدد';
  linkedSection?: string;
  linkedNationalId?: string;
  isLinked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IncomingStudentRequestFormProps {
  students: IncomingStudent[];
  onRequestSent: () => void;
  onCancel: () => void;
}

interface InstitutionSettings {
  academy: string;
  directorate: string;
  municipality: string;
  institution: string;
  academicYear: string;
}

const IncomingStudentRequestForm: React.FC<IncomingStudentRequestFormProps> = ({ 
  students, 
  onRequestSent, 
  onCancel 
}) => {
  const [requestData, setRequestData] = useState({
    requestDate: new Date().toISOString().split('T')[0],
    requestNumber: '', // سيكتبه المستخدم
    sendingNumber: '', // سيكتبه المستخدم
    requestType: '1' as '1' | '2' | '3' | '4' | 'طلب التدخل',
    locationType: 'داخل الإقليم' as 'داخل الإقليم' | 'خارج الإقليم',
    selectedService: '',
    targetInstitution: '',
    targetDirectorate: '',
    targetAcademy: '',
    includeReminder: true,
    includeStudentDetails: true,
    includeCorrespondenceHistory: false
  });

  const [institutionSettings, setInstitutionSettings] = useState<InstitutionSettings>({
    academy: 'الأكاديمية الجهوية للتربية والتكوين',
    directorate: 'المديرية الإقليمية',
    municipality: 'الجماعة',
    institution: 'المؤسسة التعليمية',
    academicYear: '2025/2026'
  });

  const [services, setServices] = useState(ServiceManager.getServices());
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    loadInstitutionSettings();
    loadServices();
  }, []);

  // تحميل إعدادات المؤسسة
  const loadInstitutionSettings = async () => {
    try {
      console.log('🔄 بدء تحميل إعدادات المؤسسة...');
      
      // محاولة جلب من قاعدة البيانات أولاً
      try {
        const dbSettings = await dbManager.getInstitutionSettings();
        if (dbSettings) {
          console.log('✅ تم جلب الإعدادات من قاعدة البيانات:', dbSettings);
          setInstitutionSettings({
            academy: dbSettings.academy || 'الأكاديمية الجهوية للتربية والتكوين',
            directorate: dbSettings.directorate || 'المديرية الإقليمية',
            municipality: dbSettings.municipality || 'الجماعة',
            institution: dbSettings.institution || 'المؤسسة التعليمية',
            academicYear: dbSettings.academicYear || '2025/2026'
          });
          return;
        }
      } catch (error) {
        console.warn('⚠️ لا توجد إعدادات في قاعدة البيانات، البحث في بيانات التلاميذ...');
      }

      // البحث في بيانات التلاميذ المستوردة
      const allStudents = await dbManager.getStudents();
      if (allStudents.length > 0) {
        const latestStudentWithMetadata = allStudents
          .filter(s => s.region || s.province || s.municipality || s.institution)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
        if (latestStudentWithMetadata) {
          console.log('✅ تم استخراج الإعدادات من بيانات التلاميذ:', latestStudentWithMetadata);
          setInstitutionSettings({
            academy: latestStudentWithMetadata.region || 'الأكاديمية الجهوية للتربية والتكوين',
            directorate: latestStudentWithMetadata.province || 'المديرية الإقليمية',
            municipality: latestStudentWithMetadata.municipality || 'الجماعة',
            institution: latestStudentWithMetadata.institution || 'المؤسسة التعليمية',
            academicYear: latestStudentWithMetadata.academicYear || '2025/2026'
          });
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل إعدادات المؤسسة:', error);
    }
  };

  // تحميل المصالح
  const loadServices = () => {
    setServices(ServiceManager.getServices());
  };

  // عرض رسالة للمستخدم
  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  // إضافة مصلحة جديدة
  const handleAddService = () => {
    if (!newServiceName.trim()) {
      showMessage('يرجى إدخال اسم المصلحة', 'error');
      return;
    }

    try {
      ServiceManager.addService(newServiceName.trim(), newServiceDescription.trim());
      loadServices();
      setNewServiceName('');
      setNewServiceDescription('');
      setShowAddService(false);
      showMessage('تم إضافة المصلحة بنجاح!', 'success');
    } catch (error) {
      console.error('خطأ في إضافة المصلحة:', error);
      showMessage(error instanceof Error ? error.message : 'خطأ في إضافة المصلحة', 'error');
    }
  };

  // حذف مصلحة
  const handleDeleteService = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (!ServiceManager.canDeleteService(serviceId)) {
      showMessage('لا يمكن حذف المصالح الافتراضية', 'error');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف المصلحة "${service.name}"؟`)) {
      try {
        const success = ServiceManager.deleteService(serviceId);
        if (success) {
          loadServices();
          // إعادة تعيين المصلحة المحددة إذا تم حذفها
          if (requestData.selectedService === serviceId) {
            setRequestData(prev => ({ ...prev, selectedService: '' }));
          }
          showMessage('تم حذف المصلحة بنجاح!', 'success');
        } else {
          showMessage('خطأ في حذف المصلحة', 'error');
        }
      } catch (error) {
        console.error('خطأ في حذف المصلحة:', error);
        showMessage('خطأ في حذف المصلحة', 'error');
      }
    }
  };

  // توليد HTML للطلب حسب نوع الإرسال
  const generateRequestHTML = (student: IncomingStudent) => {
    const selectedService = services.find(s => s.id === requestData.selectedService);
    const serviceName = selectedService ? selectedService.name : 'مصلحة الشؤون التربوية';
    
    // تحديد تنسيق المرسل إليه حسب نوع الإرسال
    const recipientFormat = requestData.locationType === 'خارج الإقليم' 
      ? `إلى السيد مدير ثانوية .................. (المؤسسة الأصلية للتلميذ الوافد)
         تحت إشراف السيد(ة) المدير(ة) الإقليمي -
         - مصلحة تأطير و تنشيط المؤسسات التعليمية، و التوجيه
         - المديرية الإقليمية ب............(المديرية الاستقبال)
         - الأكاديمية .............(الأكاديمية الأصلية)`
      : `إلى السيد(ة) مدير(ة) مصلحة الشؤون التربوية
         ثانوية المسكيني
         تحت إشراف السيد(ة) المدير(ة) الإقليمي -
         - المديرية الإقليمية -`;

    // تحديد موضوع الطلب حسب رقم الطلب
    const getSubjectByRequestType = (type: string) => {
      switch (type) {
        case '1': return 'طلب ملف مدرسي للتلميذ(ة) رقم : 01';
        case '2': return 'طلب ملف مدرسي للتلميذ(ة) رقم : 02';
        case '3': return 'طلب ملف مدرسي للتلميذ(ة) رقم : 03';
        case '4': return 'طلب ملف مدرسي للتلميذ(ة) رقم : 04';
        case 'طلب التدخل': return 'طلب التدخل';
        default: return 'طلب ملف مدرسي للتلميذ(ة)';
      }
    };

    // فحص الطلبات السابقة للتذكير
    const reminderInfo = correspondenceReminder.checkForSimilarRequests(
      student.studentId, 
      student.originalInstitution
    );

    return `
      <div style="
        font-family: 'Cairo', Arial, sans-serif;
        direction: rtl;
        background: white;
        color: #000;
        line-height: 1.6;
        padding: 15mm;
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
      ">
        <!-- رأس الوثيقة -->
        <div style="text-align: center; margin-bottom: 15mm; border-bottom: 2px solid #1e40af; padding-bottom: 8mm;">
          <div style="font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 3mm;">
            ${institutionSettings.academy}
          </div>
          <div style="font-size: 12px; color: #374151; margin-bottom: 2mm;">
            ${institutionSettings.directorate}
          </div>
          <div style="font-size: 12px; color: #374151;">
            ${institutionSettings.institution}
          </div>
        </div>

        <!-- معلومات الإرسال -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin-bottom: 15mm; font-size: 11px;">
          <div style="text-align: right;">
            <p style="margin: 0;"><strong>تاريخ:</strong> ${new Date(requestData.requestDate).toLocaleDateString('ar-EG')}</p>
          </div>
          <div style="text-align: left;">
            <p style="margin: 0;"><strong>من مدير المؤسسة</strong></p>
          </div>
        </div>

        <!-- المرسل إليه -->
        <div style="text-align: center; margin-bottom: 15mm; font-size: 12px; line-height: 1.8;">
          ${recipientFormat}
        </div>

        <!-- الموضوع -->
        <div style="text-align: center; margin-bottom: 15mm;">
          <div style="font-size: 14px; font-weight: bold; color: #000; border: 2px solid #1e40af; padding: 8mm; background: #f8fafc;">
            الموضوع: ${getSubjectByRequestType(requestData.requestType)}
          </div>
          
          <div style="margin-top: 8mm; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5mm; text-align: center;">
            <div style="border: 1px solid #1e40af; padding: 3mm; background: #f0f9ff;">
              <strong>المرجع:</strong> ${requestData.sendingNumber}
            </div>
            <div style="border: 1px solid #1e40af; padding: 3mm; background: #f0f9ff;">
              <strong>رقم الإرسال:</strong> ${requestData.requestNumber}
            </div>
            <div style="border: 1px solid #1e40af; padding: 3mm; background: #f0f9ff;">
              <strong>رقم الطلب:</strong> ${requestData.requestType === 'طلب التدخل' ? 'طلب التدخل' : `RQ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${requestData.requestType.padStart(3, '0')}`}
            </div>
          </div>
        </div>

        <!-- التحية -->
        <div style="margin-bottom: 10mm; font-size: 12px;">
          <p style="margin: 0;">سلام تام بوجود مولانا الإمام أيده الله،</p>
        </div>

        <!-- محتوى الطلب -->
        <div style="margin-bottom: 15mm; font-size: 12px; line-height: 1.8;">
          <p style="margin-bottom: 8mm;">
            وبعد، نرجو منكم التكرم بإرسال الملف المدرسي للتلميذ(ة) المذكور أدناه، وذلك لاستكمال إجراءات تسجيله بمؤسستنا للموسم الدراسي الحالي.
          </p>

          ${reminderInfo.hasReminder && requestData.includeReminder ? `
            <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 8mm; margin: 8mm 0; border-radius: 5mm;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">
                ${reminderInfo.message}
              </p>
            </div>
          ` : ''}
        </div>

        <!-- بيانات التلميذ -->
        <div style="margin-bottom: 15mm;">
          <h3 style="text-align: center; font-size: 14px; font-weight: bold; color: #000; margin-bottom: 8mm; border-bottom: 1px solid #374151; padding-bottom: 3mm;">
            بيانات التلميذ(ة)
          </h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8mm;">
            <tbody>
              ${students.map((student, index) => `
                <tr style="border: 1px solid #374151;">
                  <td style="border: 1px solid #374151; padding: 5mm; background: #f8fafc; font-weight: bold; width: 25%;">تاريخ التحويل</td>
                  <td style="border: 1px solid #374151; padding: 5mm; background: #f8fafc; font-weight: bold; width: 25%;">المستوى</td>
                  <td style="border: 1px solid #374151; padding: 5mm; background: #f8fafc; font-weight: bold; width: 25%;">النوع</td>
                  <td style="border: 1px solid #374151; padding: 5mm; background: #f8fafc; font-weight: bold; width: 25%;">الاسم الكامل</td>
                  <td style="border: 1px solid #374151; padding: 5mm; background: #f8fafc; font-weight: bold; width: 25%;">رقم التلميذ</td>
                  <td style="border: 1px solid #374151; padding: 5mm; background: #f8fafc; font-weight: bold; width: 25%;">الرقم الوطني</td>
                </tr>
                <tr style="border: 1px solid #374151;">
                  <td style="border: 1px solid #374151; padding: 5mm; text-align: center;">${student.transferDate ? new Date(student.transferDate).toLocaleDateString('ar-EG') : 'غير محدد'}</td>
                  <td style="border: 1px solid #374151; padding: 5mm; text-align: center;">${student.level || 'غير محدد'}</td>
                  <td style="border: 1px solid #374151; padding: 5mm; text-align: center;">${student.linkedGender || 'غير محدد'}</td>
                  <td style="border: 1px solid #374151; padding: 5mm; text-align: center; font-weight: bold;">${student.firstName} ${student.lastName}</td>
                  <td style="border: 1px solid #374151; padding: 5mm; text-align: center; font-family: monospace;">${student.studentId}</td>
                  <td style="border: 1px solid #374151; padding: 5mm; text-align: center; font-family: monospace;">${student.linkedNationalId || student.studentId}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- سجل المراسلات السابقة -->
        ${requestData.includeCorrespondenceHistory && reminderInfo.hasReminder ? `
          <div style="margin-bottom: 15mm;">
            <h3 style="text-align: center; font-size: 12px; font-weight: bold; color: #dc2626; margin-bottom: 5mm;">
              سجل المراسلات السابقة
            </h3>
            <div style="font-size: 10px; background: #fef2f2; border: 1px solid #fca5a5; padding: 5mm; border-radius: 3mm;">
              <p style="margin: 0; color: #991b1b;">
                نذكركم أنه سبق إرسال طلب مشابه لهذا التلميذ في التواريخ التالية:
              </p>
              <ul style="margin: 3mm 0; padding-right: 8mm; color: #7f1d1d;">
                ${reminderInfo.previousRequests.slice(0, 3).map(req => `
                  <li>تاريخ ${new Date(req.requestDate).toLocaleDateString('ar-EG')} - رقم الإرسال: ${req.sendingNumber || 'غير محدد'}</li>
                `).join('')}
              </ul>
            </div>
          </div>
        ` : ''}

        <!-- الخاتمة -->
        <div style="margin-bottom: 20mm; font-size: 12px;">
          <p style="margin-bottom: 5mm;">
            نشكركم مسبقاً على تعاونكم، وتقبلوا فائق التقدير والاحترام.
          </p>
          <p style="margin: 0; font-weight: bold;">
            والسلام عليكم ورحمة الله وبركاته.
          </p>
        </div>

        <!-- التوقيع -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin-top: 20mm; font-size: 11px;">
          <div style="text-align: center;">
            <p style="margin: 0;"><strong>تاريخ الإرسال:</strong> ${new Date(requestData.requestDate).toLocaleDateString('ar-EG')}</p>
          </div>
          <div style="text-align: center;">
            <p style="margin: 0;"><strong>مدير المؤسسة</strong></p>
            <div style="margin-top: 15mm; border-bottom: 1px solid #000; width: 60mm; margin-left: auto; margin-right: auto;"></div>
            <p style="margin: 5mm 0 0 0; font-size: 10px; color: #6b7280;">التوقيع والختم</p>
          </div>
        </div>

        <!-- تذييل الوثيقة -->
        <div style="position: absolute; bottom: 8mm; left: 15mm; right: 15mm; text-align: center; font-size: 8px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 3mm;">
          <p style="margin: 0;">تم إنشاء هذا الطلب بواسطة نظام إدارة التلاميذ - ${new Date().toLocaleDateString('ar-EG')}</p>
          <p style="margin: 2mm 0 0 0;">المرجع: ${requestData.sendingNumber} | رقم الطلب: ${requestData.requestType === 'طلب التدخل' ? 'طلب التدخل' : requestData.requestType}</p>
        </div>
      </div>
    `;
  };

  // توليد وتحميل PDF
  const generatePDF = async () => {
    if (!requestData.requestNumber.trim() || !requestData.sendingNumber.trim()) {
      showMessage('يرجى إدخال رقم الطلب ورقم الإرسال', 'error');
      return;
    }

    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;

      for (const student of students) {
        if (!isFirstPage) {
          pdf.addPage();
        }

        const printElement = document.createElement('div');
        printElement.innerHTML = generateRequestHTML(student);
        printElement.style.position = 'absolute';
        printElement.style.left = '-9999px';
        printElement.style.top = '0';
        printElement.style.width = '210mm';
        printElement.style.background = 'white';
        printElement.style.fontFamily = 'Cairo, Arial, sans-serif';
        printElement.style.direction = 'rtl';
        document.body.appendChild(printElement);

        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const canvas = await html2canvas(printElement, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: printElement.scrollHeight,
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;

          let yOffset = 0;
          while (yOffset < imgHeight) {
            if (yOffset > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 0, -yOffset, imgWidth, imgHeight);
            yOffset += pdfHeight;
          }

        } finally {
          document.body.removeChild(printElement);
        }

        isFirstPage = false;

        // حفظ الطلب في سجل المراسلات
        correspondenceReminder.saveRequest({
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          institutionName: student.originalInstitution,
          requestType: `طلب ملف مدرسي - ${requestData.requestType}`,
          requestDate: requestData.requestDate,
          sendingNumber: requestData.sendingNumber,
          reference: requestData.requestNumber,
          subject: getSubjectByRequestType(requestData.requestType),
          content: `طلب ملف مدرسي للتلميذ ${student.firstName} ${student.lastName} - ${student.studentId}`
        });
      }

      const fileName = students.length === 1 
        ? `طلب_ملف_مدرسي_${students[0].firstName}_${students[0].lastName}_${requestData.requestType}.pdf`
        : `طلبات_ملفات_مدرسية_${students.length}_تلاميذ_${requestData.requestType}.pdf`;
      
      pdf.save(fileName);
      
      showMessage(`تم توليد ${students.length} طلب بنجاح!`, 'success');
      
      // تأخير قبل استدعاء onRequestSent
      setTimeout(() => {
        onRequestSent();
      }, 1000);

    } catch (error) {
      console.error('خطأ في توليد PDF:', error);
      showMessage('خطأ في توليد ملف PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* رأس النموذج */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            توليد طلب ملف مدرسي ({students.length} تلميذ)
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* عرض الرسائل */}
        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center gap-2 ${
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

        <div className="p-6 space-y-6">
          {/* إعدادات الطلب */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              إعدادات الطلب
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* تاريخ الطلب */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الطلب *
                </label>
                <input
                  type="date"
                  value={requestData.requestDate}
                  onChange={(e) => setRequestData(prev => ({ ...prev, requestDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* رقم الطلب */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الطلب *
                </label>
                <select
                  value={requestData.requestType}
                  onChange={(e) => setRequestData(prev => ({ ...prev, requestType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">طلب رقم 1</option>
                  <option value="2">طلب رقم 2</option>
                  <option value="3">طلب رقم 3</option>
                  <option value="4">طلب رقم 4</option>
                  <option value="طلب التدخل">طلب التدخل</option>
                </select>
              </div>

              {/* نوع الإرسال */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الإرسال *
                </label>
                <select
                  value={requestData.locationType}
                  onChange={(e) => setRequestData(prev => ({ ...prev, locationType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="داخل الإقليم">داخل الإقليم</option>
                  <option value="خارج الإقليم">خارج الإقليم</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {requestData.locationType === 'داخل الإقليم' 
                    ? 'سيتم الإرسال لمؤسسة داخل نفس الإقليم' 
                    : 'سيتم الإرسال لمؤسسة خارج الإقليم'}
                </p>
              </div>

              {/* رقم الإرسال */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الإرسال *
                </label>
                <input
                  type="text"
                  value={requestData.requestNumber}
                  onChange={(e) => setRequestData(prev => ({ ...prev, requestNumber: e.target.value }))}
                  placeholder="مثال: 2025/09/24-221"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* المرجع */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المرجع *
                </label>
                <input
                  type="text"
                  value={requestData.sendingNumber}
                  onChange={(e) => setRequestData(prev => ({ ...prev, sendingNumber: e.target.value }))}
                  placeholder="مثال: REF-202509-884"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* إدارة المصالح */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                <Building className="w-5 h-5" />
                إدارة المصالح
              </h3>
              <button
                onClick={() => setShowAddService(true)}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
              >
                <Plus className="w-4 h-4" />
                إضافة مصلحة
              </button>
            </div>

            {/* قائمة المصالح */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {services.map(service => {
                const isDefault = DEFAULT_SERVICES.some(ds => ds.id === service.id);
                const canDelete = ServiceManager.canDeleteService(service.id);
                
                return (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="selectedService"
                        value={service.id}
                        checked={requestData.selectedService === service.id}
                        onChange={(e) => setRequestData(prev => ({ ...prev, selectedService: e.target.value }))}
                        className="text-green-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{service.name}</div>
                        <div className="text-xs text-gray-500">
                          {isDefault ? '(افتراضية)' : '(مخصصة)'} - {service.description}
                        </div>
                      </div>
                    </div>
                    
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                        title="حذف المصلحة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* خيارات التقرير المطبوع */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">خيارات التقرير المطبوع</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={requestData.includeReminder}
                  onChange={(e) => setRequestData(prev => ({ ...prev, includeReminder: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600"
                />
                <span className="mr-2 text-sm font-medium text-gray-700">تضمين تذكير بالطلبات السابقة</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={requestData.includeStudentDetails}
                  onChange={(e) => setRequestData(prev => ({ ...prev, includeStudentDetails: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600"
                />
                <span className="mr-2 text-sm font-medium text-gray-700">تضمين تفاصيل التلميذ</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={requestData.includeCorrespondenceHistory}
                  onChange={(e) => setRequestData(prev => ({ ...prev, includeCorrespondenceHistory: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600"
                />
                <span className="mr-2 text-sm font-medium text-gray-700">تضمين سجل المراسلات السابقة</span>
              </label>
            </div>
          </div>

          {/* معاينة التلاميذ */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">التلاميذ المحددين للطلب</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {students.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <div className="font-medium text-gray-900">{student.firstName} {student.lastName}</div>
                    <div className="text-sm text-gray-600">
                      {student.studentId} | {student.level} | {student.originalInstitution}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {student.requestCount > 0 && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                        {student.requestCount} طلب سابق
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={generatePDF}
              disabled={generating || !requestData.requestNumber.trim() || !requestData.sendingNumber.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  توليد وتحميل الطلب
                </>
              )}
            </button>
            
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
            >
              إلغاء
            </button>
          </div>
        </div>

        {/* نموذج إضافة مصلحة جديدة */}
        {showAddService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-bold text-gray-900">إضافة مصلحة جديدة</h3>
                <button
                  onClick={() => {
                    setShowAddService(false);
                    setNewServiceName('');
                    setNewServiceDescription('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم المصلحة *
                  </label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="مثال: مصلحة الامتحانات والتقويم"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف المصلحة
                  </label>
                  <textarea
                    value={newServiceDescription}
                    onChange={(e) => setNewServiceDescription(e.target.value)}
                    placeholder="وصف مختصر لمهام المصلحة..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleAddService}
                    disabled={!newServiceName.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    إضافة المصلحة
                  </button>
                  <button
                    onClick={() => {
                      setShowAddService(false);
                      setNewServiceName('');
                      setNewServiceDescription('');
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
    </div>
  );
};

export default IncomingStudentRequestForm;