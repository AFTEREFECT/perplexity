import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Building, Calendar, Users, Download, Printer, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { logoManager } from '../utils/logoManager';
import { correspondenceReminder, ReminderAlert } from '../utils/correspondenceReminder';
import ServiceManager from '../utils/serviceManager';

interface IncomingStudent {
  id: string;
  studentId: string;
  lastName: string;
  firstName: string;
  transferDate: string;
  originalInstitution: string;
  level: string;
  requestCount: number;
  notes: string;
  linkedGender?: 'ذكر' | 'أنثى' | 'غير محدد';
  linkedSection?: string;
  linkedNationalId?: string;
  isLinked: boolean;
}

interface IncomingStudentRequestFormProps {
  students: IncomingStudent[];
  onRequestSent: () => void;
  onCancel: () => void;
}

const IncomingStudentRequestForm: React.FC<IncomingStudentRequestFormProps> = ({ 
  students, 
  onRequestSent, 
  onCancel 
}) => {
  const [requestData, setRequestData] = useState({
    serviceType: 'مصلحة الشؤون التربوية',
    institutionName: '',
    requestDate: new Date().toISOString().split('T')[0],
    sendingNumber: '',
    reference: '',
    lastCorrespondenceDate: '',
    notes: '',
    requestType: 'فردي' as 'فردي' | 'جماعي',
    // خيارات التقرير المطبوع
    includeSendingNumber: true,
    includeReference: true,
    includeLastCorrespondenceDate: true
  });
  const [generating, setGenerating] = useState(false);
  const [reminderAlert, setReminderAlert] = useState<ReminderAlert | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [includeReminderInReport, setIncludeReminderInReport] = useState(false);
  const [services, setServices] = useState(ServiceManager.getServices());
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [institutionSettings, setInstitutionSettings] = useState({
    academy: 'الأكاديمية الجهوية للتربية والتكوين',
    directorate: 'المديرية الإقليمية',
    municipality: 'الجماعة',
    institution: 'المؤسسة التعليمية'
  });

  useEffect(() => {
    // فحص الطلبات المشابهة عند تحميل النموذج
    checkForSimilarRequests();
    
    // تحديد نوع الطلب بناءً على عدد التلاميذ والمؤسسات
    const uniqueInstitutions = new Set(students.map(s => s.originalInstitution));
    if (uniqueInstitutions.size === 1 && students.length > 1) {
      setRequestData(prev => ({ 
        ...prev, 
        requestType: 'جماعي',
        institutionName: Array.from(uniqueInstitutions)[0] || '',
        sendingNumber: generateSendingNumber(),
        reference: generateReference()
      }));
    } else {
      setRequestData(prev => ({ 
        ...prev, 
        requestType: 'فردي',
        institutionName: students[0]?.originalInstitution || '',
        sendingNumber: generateSendingNumber(),
        reference: generateReference()
      }));
    }

    // تحميل إعدادات المؤسسة من localStorage
    loadInstitutionSettings();
  }, [students]);

  // إضافة مصلحة جديدة
  const handleAddService = () => {
    try {
      if (!newServiceName.trim()) {
        alert('يرجى إدخال اسم المصلحة');
        return;
      }

      const newService = ServiceManager.addService(newServiceName, newServiceDescription);
      setServices(ServiceManager.getServices());
      setRequestData(prev => ({ ...prev, serviceType: newService.name }));
      setShowAddServiceModal(false);
      setNewServiceName('');
      setNewServiceDescription('');
      
      alert('تم إضافة المصلحة بنجاح!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'خطأ في إضافة المصلحة');
    }
  };

  // فحص الطلبات المشابهة
  const checkForSimilarRequests = () => {
    if (students.length > 0) {
      const firstStudent = students[0];
      const institutionName = firstStudent.originalInstitution || '';
      
      if (institutionName) {
        const reminder = correspondenceReminder.checkForSimilarRequests(
          firstStudent.studentId, 
          institutionName
        );
        
        if (reminder.hasReminder) {
          setReminderAlert(reminder);
          setShowReminderModal(true);
        }
      }
    }
  };

  // تحميل إعدادات المؤسسة
  const loadInstitutionSettings = () => {
    try {
      const saved = localStorage.getItem('institutionSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        setInstitutionSettings({
          academy: settings.academy || 'الأكاديمية الجهوية للتربية والتكوين',
          directorate: settings.directorate || 'المديرية الإقليمية',
          municipality: settings.municipality || 'الجماعة',
          institution: settings.institution || 'المؤسسة التعليمية'
        });
      }
    } catch (error) {
      console.warn('خطأ في تحميل إعدادات المؤسسة:', error);
    }
  };

  // توليد رقم الطلب
  const generateRequestNumber = (studentIndex: number = 0): string => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(studentIndex + 1).padStart(3, '0');
    
    return `RQ-${year}${month}${day}-${sequence}`;
  };

  // توليد رقم الإرسال
  const generateSendingNumber = (): string => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    
    return `${year}/${month}/${day}-${sequence}`;
  };

  // توليد المرجع
  const generateReference = (): string => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    return `REF-${year}${month}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
  };

  // توليد محتوى HTML للطلب
 
const generateRequestHTML = (
  student: IncomingStudent,
  requestNumber: string,
  isMultiple: boolean = false
) => {
  const logoHTML = logoManager.getLogoHTML();

  return `
    <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 10mm; line-height: 1.7; background: white; color: #000;">
      <!-- رأس الوثيقة -->
      <div style="text-align: center; margin-bottom: 8mm; border-bottom: 1.5px solid #1e40af; padding-bottom: 2mm;">
        ${logoHTML}
        <div style="margin-top: 3mm;">
          <div style="font-size: 16px; font-weight: bold; margin: 2mm 0;">
            ${institutionSettings.academy}
          </div>
          <div style="font-size: 16px; font-weight: bold; margin: 2mm 0;">
            ${institutionSettings.directorate}
          </div>
          <div style="font-size: 18px; color: #1e40af; margin: 2mm 0;">
            ${institutionSettings.institution}
          </div>
        </div>
      </div>
<!-- صف بيانات الطلب الأساسي (متوازي) -->
<div style="display: flex; justify-content: space-between; align-items: flex-start; margin: 24px 0 18px 0; gap: 24px;">
  <div style="text-align: left; flex: 1; min-width: 180px;">
    <div style="font-weight: 700; font-size: 15px; margin-bottom: 9px;">
      ${requestData.requestDate ? `تاريخ: ${new Date(requestData.requestDate).toLocaleDateString('fr-MA')}` : ''}
    </div>
    <div style="font-weight: 700; font-size: 15px;">
      من مدير المؤسسة
    </div>
  </div>
  <div style="text-align: right; flex: 2; min-width: 240px;">
    <div style="font-weight: 700; font-size: 15px; margin-bottom: 8px;">
      إلى السيد(ة) رئيس(ة) ${requestData.serviceType}
    </div>
    <div style="font-weight: bold; color: #1e40af; font-size: 17px;">
      ${requestData.institutionName || student.originalInstitution}
    </div>
  </div>
</div>
<!-- إطار رئيسي واسع كما في النسخة الأولى -->
<div style="margin: 30px 0 32px 0; width: 100%; max-width: 900px; background: #f8f9fa; padding: 18px 28px 10px 28px; border-radius: 16px; border: 2px solid #1e40af; text-align: right;">
  <div style="font-size: 18px; font-weight: 900; color: #1e40af; font-family: 'Cairo', Tahoma, Arial, sans-serif; margin-bottom: 12px;">
    الموضوع: طلب ملف مدرسي ${isMultiple ? 'لمجموعة من التلاميذ' : 'لتلميذ(ة)'}
  </div>
  <div style="display: flex; justify-content: flex-start; align-items: center; gap: 44px; margin-top: 8px;">
    <span style="font-weight: bold; font-size: 15px; color: #1e40af; font-family: 'Cairo', Tahoma, Arial, sans-serif;">
      رقم الطلب: ${requestNumber}
    </span>
    ${requestData.includeSendingNumber && requestData.sendingNumber ? `
      <span style="font-weight: bold; font-size: 15px; color: #1e40af; font-family: 'Cairo', Tahoma, Arial, sans-serif;">
        رقم الإرسال: ${requestData.sendingNumber}
      </span>
    ` : ''}
    ${requestData.includeReference && requestData.reference ? `
      <span style="font-weight: bold; font-size: 15px; color: #1e40af; font-family: 'Cairo', Tahoma, Arial, sans-serif;">
        المرجع: ${requestData.reference}
      </span>
    ` : ''}
  </div>
</div>


        
        <!-- المحتوى -->
        <div style="margin-bottom: 15mm; text-align: justify; line-height: 1.8;">
          <p style="margin-bottom: 8mm; text-align: center;">سلام تام بوجود مولانا الإمام أيده الله،</p>
          <p style="margin-bottom: 8mm;  text-align: justify;">
            وبعد، نرجو منكم التكرم بإرسال ${isMultiple ? 'الملفات المدرسية للتلاميذ' : 'الملف المدرسي للتلميذ(ة)'} 
            المذكور${isMultiple ? 'ين' : ''} أدناه، وذلك لاستكمال إجراءات تسجيل${isMultiple ? 'هم' : 'ه'} 
            بمؤسستنا للموسم الدراسي الحالي.
          </p>
        </div>
        
        <!-- بيانات التلميذ/التلاميذ في جدول -->
        <div style="margin-bottom: 15mm;">
          <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 8mm; text-align: center;">
            بيانات التلميذ${isMultiple ? ' المطلوب ملفاتهم' : '(ة)'}
          </h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 2px solid #374151;">
            <thead>
              <tr style="background: #e5e7eb;">
                <th style="border: 1px solid #374151; padding: 4mm; text-align: center; font-weight: bold;">الرقم الوطني</th>
                <th style="border: 1px solid #374151; padding: 4mm; text-align: center; font-weight: bold;">رقم التلميذ</th>
                <th style="border: 1px solid #374151; padding: 4mm; text-align: center; font-weight: bold;">الاسم الكامل</th>
                <th style="border: 1px solid #374151; padding: 4mm; text-align: center; font-weight: bold;">النوع</th>
                <th style="border: 1px solid #374151; padding: 4mm; text-align: center; font-weight: bold;">المستوى</th>
                <th style="border: 1px solid #374151; padding: 4mm; text-align: center; font-weight: bold;">تاريخ التحويل</th>
              </tr>
            </thead>
            <tbody>
              ${students.map((s, index) => `
                <tr style="${index % 2 === 0 ? 'background: white;' : 'background: #f9fafb;'}">
                  <td style="border: 1px solid #374151; padding: 3mm; text-align: center; font-family: monospace; font-weight: bold;">${s.linkedNationalId || s.studentId}</td>
                  <td style="border: 1px solid #374151; padding: 3mm; text-align: center; font-family: monospace; font-weight: bold;">${s.studentId}</td>
                  <td style="border: 1px solid #374151; padding: 3mm; text-align: center; font-weight: bold;">${s.firstName} ${s.lastName}</td>
                  <td style="border: 1px solid #374151; padding: 3mm; text-align: center;">${s.linkedGender || 'غير محدد'}</td>
                  <td style="border: 1px solid #374151; padding: 3mm; text-align: center;">${s.level}</td>
                  <td style="border: 1px solid #374151; padding: 3mm; text-align: center;">${s.transferDate ? new Date(s.transferDate).toLocaleDateString('fr-MA') : 'غير محدد'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
     
        <!-- سجل المراسلات السابقة (إذا كان مطلوباً) -->
        ${includeReminderInReport && reminderAlert ? `
          <div style="margin-bottom: 5mm;">
            <h4 style="font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 5mm; text-align: center;">
              سجل المراسلات السابقة
            </h4>
            <p style="font-size: 12px; color: #000000; text-align: center; margin-bottom: 5mm;">
              ${reminderAlert.message}
            </p>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #d1d5db;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="border: 1px solid #d1d5db; padding: 2mm; text-align: center; font-weight: bold;">تاريخ الإرسال</th>
                  <th style="border: 1px solid #d1d5db; padding: 2mm; text-align: center; font-weight: bold;">رقم الإرسال</th>
                  <th style="border: 1px solid #d1d5db; padding: 2mm; text-align: center; font-weight: bold;">المرجع</th>
                  <th style="border: 1px solid #d1d5db; padding: 2mm; text-align: center; font-weight: bold;">نوع الطلب</th>
                </tr>
              </thead>
              <tbody>
                ${reminderAlert.previousRequests.map((req, index) => `
                  <tr style="${index % 2 === 0 ? 'background: white;' : 'background: #f9fafb;'}">
                    <td style="border: 1px solid #d1d5db; padding: 2mm; text-align: center;">${new Date(req.requestDate).toLocaleDateString('fr-MA')}</td>
                    <td style="border: 1px solid #d1d5db; padding: 2mm; text-align: center; font-family: monospace;">${req.sendingNumber || 'غير محدد'}</td>
                    <td style="border: 1px solid #d1d5db; padding: 2mm; text-align: center; font-family: monospace;">${req.reference || 'غير محدد'}</td>
                    <td style="border: 1px solid #d1d5db; padding: 2mm; text-align: center;">${req.requestType}</td>
                  </tr> 
                `).join('')}
              </tbody>
            </table>
            
         <!--    <p style="font-size: 14px; color: #000000; text-align: center; margin-top: 3mm;">
              إجمالي المراسلات السابقة لهذا التلميذ: ${reminderAlert.requestCount} مراسلة
            </p> -->
   <!-- الخاتمة -->
        <div style="margin-bottom:5mm; text-align: justify; line-height: 1.8;">
          <p style="margin-bottom: 5mm;">
            نشكركم مسبقاً على تعاونكم وسرعة استجابتكم، ونؤكد لكم استعدادنا للتعاون المتبادل.
          </p>
          <p>وتقبلوا فائق الاحترام والتقدير.</p>
        </div>
        
            
          </div>
        ` : ''}
    
   <!-- صناديق التوقيعات -->
<div style="padding: 5mm; display: flex; justify-content: space-between; text-align: center;">
  <span style="font-size: 14px; text-align: right; flex: 1;">توقيع السيد الحارس العام</span>
  <span style="font-weight: bold; font-size: 14px; text-align: left; flex: 1;">توقيع السيد(ة) المدير(ة)</span>
</div>

 
    `;
  };

  // توليد PDF للطلب
  const generateRequestPDF = async () => {
    if (students.length === 0) {
      alert('لا توجد تلاميذ محددين');
      return;
    }

    setGenerating(true);
    
    try {
      // حفظ الطلب في سجل المراسلات قبل التوليد
      const firstStudent = students[0];
      correspondenceReminder.saveRequest({
        studentId: firstStudent.studentId,
        studentName: `${firstStudent.firstName} ${firstStudent.lastName}`,
        institutionName: requestData.institutionName || firstStudent.originalInstitution,
        requestType: requestData.requestType,
        requestDate: requestData.requestDate,
        sendingNumber: requestData.sendingNumber,
        reference: requestData.reference,
        subject: `طلب ملف مدرسي ${requestData.requestType === 'جماعي' ? 'جماعي' : 'فردي'}`,
        content: `طلب ملف مدرسي للتلميذ ${firstStudent.firstName} ${firstStudent.lastName}`
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;

      if (requestData.requestType === 'جماعي' && students.length > 1) {
        // طلب جماعي واحد لجميع التلاميذ
        const requestNumber = generateRequestNumber();
        const htmlContent = generateRequestHTML(students[0], requestNumber, true);
        
        await addPageToPDF(pdf, htmlContent, isFirstPage);
        
      } else {
        // طلبات فردية لكل تلميذ
        for (let i = 0; i < students.length; i++) {
          const student = students[i];
          const requestNumber = generateRequestNumber(i);
          const htmlContent = generateRequestHTML(student, requestNumber, false);
          
          if (!isFirstPage) {
            pdf.addPage();
          }
          
          await addPageToPDF(pdf, htmlContent, isFirstPage);
          isFirstPage = false;
        }
      }

      // حفظ الملف
      const fileName = requestData.requestType === 'جماعي' 
        ? `طلب_ملفات_جماعي_${(requestData.institutionName || 'مؤسسة').replace(/\s+/g, '_')}_${requestData.requestDate}.pdf`
        : `طلبات_ملفات_فردية_${requestData.requestDate}.pdf`;
      
      pdf.save(fileName);
      
      // تأكيد الإرسال
      onRequestSent();
      
      alert( `تم توليد ${requestData.requestType === 'جماعي' ? 'طلب جماعي واحد' : `${students.length} طلب فردي`} بنجاح!`);
      
    } catch (error) {
      console.error('خطأ في توليد PDF:', error);
      alert('خطأ في توليد ملف PDF');
    } finally {
      setGenerating(false);
    }
  };

  // إضافة صفحة إلى PDF
  const addPageToPDF = async (pdf: jsPDF, htmlContent: string, isFirstPage: boolean) => {
    const printElement = document.createElement('div');
    printElement.innerHTML = htmlContent;
    printElement.style.position = 'absolute';
    printElement.style.left = '-9999px';
    printElement.style.top = '0';
    printElement.style.width = '210mm';
    printElement.style.background = 'white';
    document.body.appendChild(printElement);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
    } finally {
      document.body.removeChild(printElement);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequestData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* رأس النموذج */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            طلب ملف مدرسي ({students.length} تلميذ)
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى النموذج */}
        <div className="p-6 space-y-6">
          {/* معلومات التلاميذ */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              التلاميذ المحددين ({students.length})
            </h3>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {students.map((student, index) => (
                <div key={student.id} className="bg-white p-3 rounded border flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{student.firstName} {student.lastName}</div>
                    <div className="text-sm text-gray-600">{student.studentId} - {student.level}</div>
                    {student.isLinked && (
                      <div className="text-xs text-green-600">مرتبط: {student.linkedGender} - {student.linkedSection}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{student.originalInstitution}</div>
                </div>
              ))}
            </div>
          </div>

          {/* إعدادات الطلب */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              إعدادات الطلب
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* نوع الطلب */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الطلب
                </label>
                <select
                  name="requestType"
                  value={requestData.requestType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="فردي">طلبات فردية لكل تلميذ</option>
                  <option value="جماعي">طلب جماعي واحد</option>
                </select>
              </div>

              {/* تاريخ الطلب */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الطلب
                </label>
                <input
                  type="date"
                  name="requestDate"
                  value={requestData.requestDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* نوع المصلحة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع المصلحة *
                </label>
                <div className="flex gap-2">
                  <select
                    name="serviceType"
                    value={requestData.serviceType}
                    onChange={handleChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">اختر المصلحة</option>
                    {services.map(service => (
                      <option key={service.id} value={service.name}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddServiceModal(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    title="إضافة مصلحة جديدة"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* اسم المؤسسة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المؤسسة المرسل إليها
                </label>
                <input
                  type="text"
                  name="institutionName"
                  value={requestData.institutionName}
                  onChange={handleChange}
                  placeholder="سيتم ملؤه تلقائياً"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              {/* رقم الإرسال */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الإرسال
                </label>
                <input
                  type="text"
                  name="sendingNumber"
                  value={requestData.sendingNumber}
                  onChange={handleChange}
                  placeholder="مثال: 2025 -001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              {/* المرجع */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المرجع
                </label>
                <input
                  type="text"
                  name="reference"
                  value={requestData.reference}
                  onChange={handleChange}
                  placeholder="مثال: REF-202501-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              {/* تاريخ آخر مراسلة 
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ آخر مراسلة (اختياري)
                </label>
                <input
                  type="date"
                  name="lastCorrespondenceDate"
                  value={requestData.lastCorrespondenceDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>*/}
            </div>
             
            {/* خيارات التقرير المطبوع */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">خيارات التقرير المطبوع</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeSendingNumber"
                    checked={requestData.includeSendingNumber}
                    onChange={(e) => setRequestData(prev => ({ ...prev, includeSendingNumber: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="mr-2 text-sm font-medium text-gray-700">تضمين رقم الإرسال</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeReference"
                    checked={requestData.includeReference}
                    onChange={(e) => setRequestData(prev => ({ ...prev, includeReference: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="mr-2 text-sm font-medium text-gray-700">تضمين المرجع</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="includeLastCorrespondenceDate"
                    checked={requestData.includeLastCorrespondenceDate}
                    onChange={(e) => setRequestData(prev => ({ ...prev, includeLastCorrespondenceDate: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeReminderInReport}
                    onChange={(e) => setIncludeReminderInReport(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                  />
                  <span className="mr-2 text-sm font-medium text-gray-700">تضمين سجل المراسلات السابقة</span>
                </label>
              </div>
            </div>

            {/* ملاحظات إضافية */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات إضافية
              </label>
              <textarea
                name="notes"
                value={requestData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="أي ملاحظات إضافية للطلب..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* معاينة الطلب */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">معاينة الطلب</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>نوع الطلب:</strong> {requestData.requestType}</p>
              <p><strong>عدد التلاميذ:</strong> {students.length}</p>
              <p><strong>المؤسسة المرسل إليها:</strong> {requestData.institutionName}</p>
              <p><strong>نوع المصلحة:</strong> {requestData.serviceType || 'مصلحة الشؤون التربوية'}</p>
              <p><strong>رقم الطلب:</strong> {generateRequestNumber()}</p>
              {requestData.includeSendingNumber && requestData.sendingNumber && (
                <p><strong>رقم الإرسال:</strong> {requestData.sendingNumber}</p>
              )}
              {requestData.includeReference && requestData.reference && (
                <p><strong>المرجع:</strong> {requestData.reference}</p>
              )}
              {requestData.includeLastCorrespondenceDate && requestData.lastCorrespondenceDate && (
                <p><strong>تاريخ آخر مراسلة:</strong> {new Date(requestData.lastCorrespondenceDate).toLocaleDateString('fr-MA')}</p>
              )}
              {requestData.requestType === 'فردي' && students.length > 1 && (
                <p className="text-blue-600"><strong>ملاحظة:</strong> سيتم توليد {students.length} طلب منفصل</p>
              )}
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>الربط التلقائي:</strong> سيتم جلب الجنس والقسم من قاعدة البيانات الرئيسية تلقائياً للتلاميذ المرتبطين
                </p>
              </div>
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={generateRequestPDF}
              disabled={generating || students.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  توليد وإرسال الطلب
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
            >
              إلغاء
            </button>
          </div>
        </div>

        {/* مودال التذكير بالمراسلات السابقة */}
        {showReminderModal && reminderAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">🚨 تنبيه: مراسلات سابقة</h2>
                <p className="text-red-100">تم العثور على طلبات سابقة لنفس التلميذ</p>
              </div>

              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">رسالة التذكير</span>
                  </div>
                  <p className="text-red-800 font-medium">{reminderAlert.message}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                  <div className="bg-gray-50 p-3 border-b">
                    <h3 className="font-semibold text-gray-900">تفاصيل المراسلات السابقة</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-center font-bold text-gray-700">تاريخ الإرسال</th>
                          <th className="px-4 py-2 text-center font-bold text-gray-700">رقم الإرسال</th>
                          <th className="px-4 py-2 text-center font-bold text-gray-700">المرجع</th>
                          <th className="px-4 py-2 text-center font-bold text-gray-700">نوع الطلب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reminderAlert.previousRequests.map((req, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                            <td className="px-4 py-2 text-center font-bold text-red-600">
                              {new Date(req.requestDate).toLocaleDateString('fr-MA')}
                            </td>
                            <td className="px-4 py-2 text-center font-mono text-gray-700">
                              {req.sendingNumber || 'غير محدد'}
                            </td>
                            <td className="px-4 py-2 text-center font-mono text-gray-700">
                              {req.reference || 'غير محدد'}
                            </td>
                            <td className="px-4 py-2 text-center text-gray-700">{req.requestType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">خيارات المتابعة</span>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeReminderInReport}
                        onChange={(e) => setIncludeReminderInReport(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="mr-2 text-sm font-medium text-blue-800">
                        تضمين سجل المراسلات السابقة في التقرير المطبوع
                      </span>
                    </label>
                    <p className="text-xs text-blue-700 mr-6">
                      سيتم إضافة جدول بجميع المراسلات السابقة في التقرير النهائي
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowReminderModal(false);
                      // المتابعة مع توليد التقرير
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    متابعة رغم التذكير
                  </button>
                  <button
                    onClick={() => {
                      setShowReminderModal(false);
                      onCancel();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                  >
                    إلغاء والمراجعة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* مودال إضافة مصلحة جديدة */}
        {showAddServiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">إضافة مصلحة جديدة</h2>
                <button
                  onClick={() => {
                    setShowAddServiceModal(false);
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
                    placeholder="مثال: مصلحة التأطير والتوجيه"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف المصلحة (اختياري)
                  </label>
                  <textarea
                    value={newServiceDescription}
                    onChange={(e) => setNewServiceDescription(e.target.value)}
                    rows={3}
                    placeholder="وصف مختصر للمصلحة..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleAddService}
                    disabled={!newServiceName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    إضافة المصلحة
                  </button>
                  <button
                    onClick={() => {
                      setShowAddServiceModal(false);
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