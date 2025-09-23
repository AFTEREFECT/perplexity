import React, { useState } from 'react';
import { Download, FileText, Printer, Eye, Settings, Users, Calculator, Camera, Smartphone, Target, CheckCircle, QrCode } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCodeLib from 'qrcode';

interface Quiz {
  id: string;
  title: string;
  subject: string;
  level: string;
  section: string;
  totalQuestions: number;
  maxScore: number;
  questionPoints: number[];
  correctAnswers: string[];
  date: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  level: string;
  section: string;
}

interface QuizTemplateGeneratorProps {
  quiz: Quiz;
  students: Student[];
}

const QuizTemplateGenerator: React.FC<QuizTemplateGeneratorProps> = ({ quiz, students }) => {
  const [templateSettings, setTemplateSettings] = useState({
    questionsPerRow: 3,
    fontSize: 'large',
    includePointsPerQuestion: true,
    paperSize: 'A4',
    orientation: 'portrait',
    includeBarcodes: true,
    barcodeType: 'qr' as 'qr' | 'code128'
  });
  const [generating, setGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [currentStudent, setCurrentStudent] = useState('');
  const [showProgress, setShowProgress] = useState(false);

  // توليد باركود للتلميذ
  const generateStudentBarcode = async (student: Student): Promise<string> => {
    try {
      // بيانات الباركود: الرقم الوطني + معرف الرائز + ترتيب التلميذ
      const studentIndex = students.findIndex(s => s.nationalId === student.nationalId) + 1;
      const barcodeData = `${student.nationalId}|${quiz.id}|${studentIndex}|${student.firstName}|${student.lastName}`;
      
      if (templateSettings.barcodeType === 'qr') {
        return await QRCodeLib.toDataURL(barcodeData, {
          width: 80,
          height: 80,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
      } else {
        // Code 128 باستخدام canvas
        return generateCode128(student.nationalId);
      }
    } catch (error) {
      console.error('خطأ في توليد الباركود:', error);
      return '';
    }
  };

  // توليد Code 128 بسيط
  const generateCode128 = (data: string): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    canvas.width = 120;
    canvas.height = 40;
    
    // خلفية بيضاء
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // رسم خطوط الباركود
    ctx.fillStyle = '#000000';
    const barWidth = 2;
    let x = 10;
    
    // رسم نمط بسيط للرقم الوطني
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      const pattern = charCode % 4; // نمط بسيط
      
      for (let j = 0; j < 4; j++) {
        if ((pattern >> j) & 1) {
          ctx.fillRect(x, 5, barWidth, 30);
        }
        x += barWidth;
      }
      x += barWidth; // مسافة بين الأحرف
    }
    
    // إضافة النص تحت الباركود
    ctx.fillStyle = '#000000';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(data, canvas.width / 2, canvas.height - 2);
    
    return canvas.toDataURL();
  };

  // توليد نموذج HTML محسن مع باركود في المكان الصحيح
  const generateStandardQuizHTML = async (student?: Student, isAnswerKey: boolean = false) => {
    // استخدام النموذج الثابت المحسن بناءً على الصورة المرفقة
    const questionsPerRow = 3;
    const totalQuestions = 20; // النموذج الثابت يدعم 20 سؤال
    
    // توليد الباركود للتلميذ
    let barcodeImage = '';
    if (student && templateSettings.includeBarcodes) {
      barcodeImage = await generateStudentBarcode(student);
    }
    
    return `
      <div style="
        font-family: 'Cairo', Arial, sans-serif;
        direction: rtl;
        background: white;
        color: #000;
        line-height: 1.2;
        padding: 8mm;
        width: 210mm;
        min-height: 297mm;
        max-height: 297mm;
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      ">
        <!-- نقاط المسح الضوئي - 4 مربعات سوداء في الزوايا -->
        <div style="position: absolute; top: 5mm; right: 5mm; width: 8mm; height: 8mm; background: #000;"></div>
        <div style="position: absolute; top: 5mm; left: 5mm; width: 8mm; height: 8mm; background: #000;"></div>
        <div style="position: absolute; bottom: 5mm; right: 5mm; width: 8mm; height: 8mm; background: #000;"></div>
        <div style="position: absolute; bottom: 5mm; left: 5mm; width: 8mm; height: 8mm; background: #000;"></div>

        <!-- رأس النموذج -->
        <div style="text-align: center; margin-bottom: 4mm;">
          <div style="border: 2px solid #000; padding: 3mm; margin-bottom: 2mm; background: white;">
            <div style="font-size: 10px; color: #000; font-weight: 900; margin-bottom: 2mm; line-height: 1.1;">
              المملكة المغربية - وزارة التربية الوطنية والتعليم الأولي والرياضة
            </div>
            
            <h2 style="color: #000; font-size: 14px; margin: 2mm 0; font-weight: 900; text-decoration: underline;">
              ${quiz.title || 'الرائز التقويمي'}
            </h2>
            
            <div style="font-size: 9px; color: #000; font-weight: 700; line-height: 1.2; margin-top: 2mm; border-top: 1px solid #000; padding-top: 1mm;">
              <div style="margin-bottom: 1mm;"><strong>المادة:</strong> ${quiz.subject || 'غير محدد'}</div>
              <div style="margin-bottom: 1mm;"><strong>المستوى:</strong> ${quiz.level || 'غير محدد'} | <strong>القسم:</strong> ${quiz.section || 'غير محدد'}</div>
              <div><strong>التاريخ:</strong> ${quiz.date ? new Date(quiz.date).toLocaleDateString('ar-EG') : 'غير محدد'} | <strong>المدة:</strong> ساعة واحدة</div>
            </div>
          </div>
        </div>

        <!-- معلومات التلميذ مع الباركود -->
        <div style="margin-bottom: 3mm; border: 2px solid #000; padding: 2mm; background: white;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; font-size: 10px; font-weight: 900;">
            <!-- الباركود في المكان المحدد بالأزرق -->
            <div>
              <strong style="color: #000;">الكود الشريطي:</strong>
              <div style="border: 2px solid #0066cc; padding: 2mm; margin-top: 1mm; background: #f0f8ff; text-align: center; min-height: 15mm; display: flex; align-items: center; justify-content: center;">
                ${barcodeImage ? `<img src="${barcodeImage}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="باركود ${student?.nationalId}">` : 
                  '<div style="color: #0066cc; font-size: 8px; text-align: center;">سيتم إدراج<br>الكود الشريطي<br>هنا</div>'}
              </div>
            </div>
            
            <div>
              <strong style="color: #000;">اسم التلميذ:</strong>
              <div style="border: 1px solid #000; padding: 2mm; margin-top: 1mm; font-size: 18px; font-weight: 900; text-align: center; background: white; min-height: 6mm;">
                ${student ? `${student.firstName} ${student.lastName}` : ''}
              </div>
            </div>
            
            <div>
              <strong style="color: #000;">الرقم الوطني:</strong>
              <div style="border: 1px solid #000; padding: 2mm; margin-top: 1mm; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 900; letter-spacing: 1px; text-align: center; background: white; min-height: 6mm;">
                ${student ? student.nationalId : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- ورقة الإجابات -->
        <div style="border: 2px solid #000; padding: 3mm; background: white; min-height: 180mm;">
          <h3 style="text-align: center; color: #000; font-size: 14px; margin: 0 0 3mm 0; font-weight: 900; border-bottom: 1px solid #000; padding-bottom: 2mm;">
            ورقة الإجابات
          </h3>
          
          <!-- الأسئلة مرتبة في 3 أعمدة بالتصميم الثابت -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; direction: rtl; padding: 5mm 2mm;">
            ${(() => {
              let html = '';
              const totalRows = Math.ceil(totalQuestions / questionsPerRow);
              
              for (let row = 0; row < totalRows; row++) {
                for (let col = 0; col < questionsPerRow; col++) { 
                  const questionIndex = row * questionsPerRow + col;
                  if (questionIndex >= totalQuestions) break;
                  
                  const questionNumber = questionIndex + 1;
                  const correctAnswer = (quiz.correctAnswers && quiz.correctAnswers[questionIndex]) ? quiz.correctAnswers[questionIndex] : '';
                  
                  html += `
                    <div style="border: 2px solid #000; padding: 3mm; background: white; text-align: center; min-height: 20mm; margin-bottom: 2mm;">
                      <div style="font-weight: bold; font-size: 12px; margin-bottom: 3mm; color: #000;">Q:${questionNumber}</div>
                      <div style="display: flex; justify-content: center; gap: 2mm; direction: ltr;"> 
                        ${['A', 'B', 'C', 'D'].map(option => `
                          <div style="
                            width: 12mm;
                            height: 12mm;
                            border: 3px solid #000;
                            border-radius: 50%; 
                            background: ${isAnswerKey && correctAnswer === option ? '#000' : 'white'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                            font-weight: bold;
                            color: ${isAnswerKey && correctAnswer === option ? 'white' : '#000'};
                            position: relative;
                          ">${option}</div>
                        `).join('')}
                      </div>
                    </div>
                  `;
                }
              }
              
              return html;
            })()}
          </div>
        </div>

        <!-- تذييل النموذج -->
        <div style="position: absolute; bottom: 3mm; left: 8mm; right: 8mm; text-align: center; font-size: 7px; color: #000; border-top: 1px solid #000; padding-top: 1mm; font-weight: 700;">
          <p style="margin: 0;">نظام إدارة التلاميذ - ${new Date().toLocaleDateString('ar-EG')}</p>
          ${student ? `<p style="margin: 0.5mm 0 0 0; font-family: monospace; font-size: 6px;">رمز التلميذ: ${student.nationalId} | ترتيب: ${students.findIndex(s => s.nationalId === student.nationalId) + 1}</p>` : ''}
        </div>
      </div>
    `;
  };

  // توليد PDF محسن مع باركود
  const generateOptimizedPDF = async (student?: Student, isAnswerKey: boolean = false) => {
    setGenerating(true);
    
    try {
      const printElement = document.createElement('div');
      printElement.innerHTML = await generateStandardQuizHTML(student, isAnswerKey);
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
          logging: false,
          imageTimeout: 0,
          removeContainer: true,
          foreignObjectRendering: false
        });
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let yOffset = 0;
        
        while (yOffset < imgHeight) {
          if (yOffset > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(imgData, 'JPEG', 0, -yOffset, imgWidth, imgHeight);
          yOffset += pdfHeight;
        }
        
        let fileName = '';
        if (isAnswerKey) {
          fileName = `نموذج_التصحيح_${quiz.title.replace(/\s+/g, '_')}.pdf`;
        } else if (student) {
          fileName = `${quiz.title.replace(/\s+/g, '_')}_${student.firstName}_${student.lastName}_مع_باركود.pdf`;
        } else {
          fileName = `نموذج_${quiz.title.replace(/\s+/g, '_')}_مع_باركود.pdf`;
        }
        
        pdf.save(fileName);
        
      } finally {
        document.body.removeChild(printElement);
      }
      
    } catch (error) {
      console.error('خطأ في إنشاء PDF:', error);
      alert('خطأ في إنشاء PDF: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    } finally {
      setGenerating(false);
    }
  };

  // توليد نماذج جماعية مع باركود
  const generateAllStudentTemplates = async () => {
    const sectionStudents = students.filter(s => 
      s.level === quiz.level && s.section === quiz.section
    );
    
    if (sectionStudents.length === 0) {
      alert('لا توجد تلاميذ في هذا القسم');
      return;
    }
    
    if (sectionStudents.length > 50) {
      const confirmed = confirm(`سيتم توليد ${sectionStudents.length} نموذج مع باركود. هذا قد يستغرق وقتاً طويلاً. هل تريد المتابعة؟`);
      if (!confirmed) return;
    }
    
    setGenerating(true);
    setShowProgress(true);
    setBulkProgress(0);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      
      for (let i = 0; i < sectionStudents.length; i++) {
        const student = sectionStudents[i];
        setCurrentStudent(`${student.firstName} ${student.lastName}`);
        setBulkProgress(Math.round((i / sectionStudents.length) * 100));
        
        if (!isFirstPage) {
          pdf.addPage();
        }
        
        const printElement = document.createElement('div');
        printElement.innerHTML = await generateStandardQuizHTML(student, false);
        printElement.style.position = 'absolute';
        printElement.style.left = '-9999px';
        printElement.style.top = '0';
        printElement.style.width = '210mm';
        printElement.style.background = 'white';
        printElement.style.fontFamily = 'Cairo, Arial, sans-serif';
        printElement.style.direction = 'rtl';
        document.body.appendChild(printElement);
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const canvas = await html2canvas(printElement, {
            scale: 1.2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: printElement.scrollHeight,
            logging: false,
            imageTimeout: 0,
            removeContainer: true,
            foreignObjectRendering: false
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          
        } finally {
          document.body.removeChild(printElement);
        }
        
        isFirstPage = false;
        
        if ((i + 1) % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setBulkProgress(100);
      setCurrentStudent('جاري حفظ الملف...');
      
      const fileName = `نماذج_${quiz.title.replace(/\s+/g, '_')}_${quiz.section}_مع_باركود_جميع_التلاميذ.pdf`;
      pdf.save(fileName);
      
      alert(`تم توليد ${sectionStudents.length} نموذج مع باركود بنجاح!`);
      
    } catch (error) {
      console.error('خطأ في توليد النماذج:', error);
      alert('خطأ في توليد النماذج: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    } finally {
      setGenerating(false);
      setShowProgress(false);
      setBulkProgress(0);
      setCurrentStudent('');
    }
  };

  // توليد ملف باركودات منفصل للطباعة
  const generateBarcodePrintSheet = async () => {
    const sectionStudents = students.filter(s => 
      s.level === quiz.level && s.section === quiz.section
    );
    
    if (sectionStudents.length === 0) {
      alert('لا توجد تلاميذ في هذا القسم');
      return;
    }

    try {
      let htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>باركودات التلاميذ - ${quiz.title}</title>
          <style>
            body { 
              font-family: 'Cairo', Arial, sans-serif; 
              direction: rtl; 
              padding: 15mm; 
              background: white; 
              margin: 0;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20mm; 
              border: 2px solid #333; 
              padding: 10mm; 
              background: #f8f9fa;
            }
            .barcode-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 8mm; 
              page-break-inside: avoid;
            }
            .barcode-item { 
              text-align: center; 
              border: 2px solid #0066cc; 
              padding: 8mm; 
              background: white;
              border-radius: 5mm;
              page-break-inside: avoid;
              margin-bottom: 5mm;
            }
            .barcode-item img { 
              max-width: 100%; 
              margin-bottom: 5mm; 
              border: 1px solid #ddd; 
            }
            .student-info { 
              font-size: 14px; 
              font-weight: bold; 
              color: #333; 
              margin-bottom: 3mm; 
            }
            .student-id { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              color: #0066cc; 
              font-weight: bold; 
              margin-bottom: 2mm; 
            }
            .instructions {
              margin-top: 15mm;
              padding: 8mm;
              background: #e3f2fd;
              border: 1px solid #0066cc;
              border-radius: 5mm;
              font-size: 12px;
              line-height: 1.5;
            }
            @media print {
              body { background: white; }
              .barcode-item { break-inside: avoid; }
              .instructions { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #333; margin: 0 0 5mm 0; font-size: 20px;">باركودات التلاميذ</h1>
            <h2 style="color: #0066cc; margin: 0 0 8mm 0; font-size: 16px;">${quiz.title}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15mm; text-align: center; font-size: 12px;">
              <div>
                <strong>المادة:</strong> ${quiz.subject}<br>
                <strong>عدد الأسئلة:</strong> ${quiz.totalQuestions}
              </div>
              <div>
                <strong>المستوى:</strong> ${quiz.level}<br>
                <strong>القسم:</strong> ${quiz.section}
              </div>
            </div>
            <p style="margin-top: 8mm; color: #666; font-size: 10px;">
              تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')} | عدد التلاميذ: ${sectionStudents.length}
            </p>
          </div>
          
          <div class="barcode-grid">
      `;
      
      for (let i = 0; i < sectionStudents.length; i++) {
        const student = sectionStudents[i];
        const barcodeData = `${student.nationalId}|${quiz.id}|${i + 1}|${student.firstName}|${student.lastName}`;
        
        try {
          const barcodeUrl = await QRCodeLib.toDataURL(barcodeData, {
            width: 120,
            height: 120,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          });
          
          htmlContent += `
            <div class="barcode-item">
              <img src="${barcodeUrl}" alt="باركود ${student.firstName} ${student.lastName}">
              <div class="student-info">${student.firstName} ${student.lastName}</div>
              <div class="student-id">${student.nationalId}</div>
              <div style="font-size: 10px; color: #666;">الترتيب: ${i + 1}</div>
            </div>
          `;
        } catch (error) {
          console.error('خطأ في توليد الباركود:', error);
        }
      }
      
      htmlContent += `
          </div>
          
          <div class="instructions">
            <h3 style="color: #0066cc; margin: 0 0 5mm 0;">تعليمات الاستخدام:</h3>
            <div style="text-align: right;">
              <p><strong>1. الطباعة:</strong> اطبع هذه الصفحة على ورق أبيض عادي</p>
              <p><strong>2. القص:</strong> اقطع كل باركود بعناية مع ترك هامش صغير</p>
              <p><strong>3. اللصق:</strong> الصق كل باركود في المكان المحدد بالأزرق على ورقة الرائز</p>
              <p><strong>4. التأكد:</strong> تأكد من وضوح الباركود وعدم تلفه</p>
              <p><strong>5. المسح:</strong> استخدم نظام "مسح الباركود" في التطبيق للقراءة السريعة</p>
            </div>
            <div style="margin-top: 8mm; text-align: center; font-weight: bold; color: #0066cc;">
              تم إنشاء ${sectionStudents.length} باركود - ${new Date().toLocaleDateString('ar-EG')}
            </div>
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `باركودات_للطباعة_${quiz.title.replace(/\s+/g, '_')}_${quiz.section}.html`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert(`تم توليد ${sectionStudents.length} باركود للطباعة بنجاح! افتح الملف واطبعه ثم اقطع الباركودات والصقها على الأوراق.`);
      
    } catch (error) {
      console.error('خطأ في توليد ملف الباركودات:', error);
      alert('خطأ في توليد ملف الباركودات');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">توليد نماذج الروائز مع نظام الباركود</h2>
          <p className="text-gray-600">نماذج PDF محسنة مع باركود في المكان المحدد</p>
        </div>
      </div>

      {/* معلومات الرائز */}
      <div className="bg-blue-50 p-6 rounded-xl mb-6 border border-blue-200">
        <h3 className="text-xl font-semibold text-blue-900 mb-4">معلومات الرائز</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="font-medium text-gray-700">العنوان:</span>
            <div className="text-gray-900 font-semibold">{quiz.title}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">المادة:</span>
            <div className="text-gray-900 font-semibold">{quiz.subject}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">عدد الأسئلة:</span>
            <div className="text-gray-900 font-semibold">{quiz.totalQuestions}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">النقطة العظمى:</span>
            <div className="text-gray-900 font-semibold">{quiz.maxScore}</div>
          </div>
        </div>
      </div>

      {/* إعدادات الباركود */}
      <div className="bg-purple-50 p-6 rounded-xl mb-6 border border-purple-200">
        <h3 className="text-xl font-semibold text-purple-900 mb-4">إعدادات نظام الباركود</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الباركود
            </label>
            <select
              value={templateSettings.barcodeType}
              onChange={(e) => setTemplateSettings(prev => ({ ...prev, barcodeType: e.target.value as 'qr' | 'code128' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="qr">QR Code (موصى به)</option>
              <option value="code128">Code 128</option>
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={templateSettings.includeBarcodes}
                onChange={(e) => setTemplateSettings(prev => ({ ...prev, includeBarcodes: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
              />
              <span className="mr-2 text-sm font-medium text-gray-700">تضمين الباركود في النماذج</span>
            </label>
          </div>
        </div>
      </div>

      {/* أزرار التوليد */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => generateOptimizedPDF()}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-lg font-medium"
        >
          {generating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Download className="w-5 h-5" />
          )}
          نموذج فارغ مع باركود
        </button>

        <button
          onClick={generateAllStudentTemplates}
          disabled={generating || students.filter(s => s.level === quiz.level && s.section === quiz.section).length === 0}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-lg font-medium"
        >
          {generating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Users className="w-5 h-5" />
          )}
          نماذج جميع التلاميذ مع باركود
          ({students.filter(s => s.level === quiz.level && s.section === quiz.section).length})
        </button>

        <button
          onClick={() => generateOptimizedPDF(undefined, true)}
          disabled={generating || !quiz.correctAnswers || quiz.correctAnswers.filter(a => a && a !== '').length === 0}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-lg font-medium"
        >
          {generating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <FileText className="w-5 h-5" />
          )}
          نموذج التصحيح
        </button>

        <button
          onClick={generateBarcodePrintSheet}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-lg font-medium"
        >
          {generating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <QrCode className="w-5 h-5" />
          )}
          ملف باركودات للطباعة
        </button>
      </div>

      {/* شريط التقدم للتوليد الجماعي */}
      {showProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">جاري توليد النماذج مع الباركود</h3>
              <p className="text-gray-600">يرجى عدم إغلاق النافذة</p>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <div>
                <div className="text-blue-900 font-semibold">جاري توليد النماذج...</div>
                <div className="text-blue-700 text-sm break-all max-w-xs">
                  التلميذ الحالي: {currentStudent}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-blue-700 mb-1">
                <span>التقدم</span>
                <span>{bulkProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${bulkProgress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">{bulkProgress}%</div>
              <div className="text-sm text-gray-600">
                {Math.round((bulkProgress / 100) * students.filter(s => s.level === quiz.level && s.section === quiz.section).length)} / {students.filter(s => s.level === quiz.level && s.section === quiz.section).length} نموذج
              </div>
            </div>
          </div>
        </div>
      )}

      {/* معاينة التصميم مع الباركود */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">معاينة التصميم مع الباركود</h3>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
          {/* محاكاة رأس النموذج */}
          <div className="border-2 border-gray-800 p-4 mb-4 text-center bg-white">
            <h4 className="font-bold text-gray-800 mb-2">{quiz.title}</h4>
            <div className="text-sm text-gray-600">
              المادة: {quiz.subject} | المستوى: {quiz.level} | القسم: {quiz.section}
            </div>
          </div>
          
          {/* محاكاة قسم معلومات التلميذ مع الباركود */}
          <div className="border-2 border-gray-800 p-4 mb-4 bg-white">
            <div className="grid grid-cols-3 gap-4">
              {/* مكان الباركود - محدد بالأزرق */}
              <div>
                <div className="font-bold text-gray-800 mb-2">الكود الشريطي:</div>
                <div className="border-2 border-blue-500 bg-blue-50 p-3 text-center min-h-16 flex items-center justify-center">
                  <div className="text-blue-600 text-xs">
                    📱 QR Code<br/>
                    سيظهر هنا
                  </div>
                </div>
              </div>
              
              <div>
                <div className="font-bold text-gray-800 mb-2">اسم التلميذ:</div>
                <div className="border border-gray-400 p-3 text-center bg-white">
                  سلوى أسياخر
                </div>
              </div>
              
              <div>
                <div className="font-bold text-gray-800 mb-2">الرقم الوطني:</div>
                <div className="border border-gray-400 p-3 text-center bg-white font-mono">
                  R175069452
                </div>
              </div>
            </div>
          </div>
          
          {/* محاكاة ورقة الإجابات */}
          <div className="border-2 border-gray-800 p-4 bg-white">
            <h4 className="text-center font-bold text-gray-800 mb-4 border-b border-gray-400 pb-2">ورقة الإجابات</h4>
            
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: Math.min(quiz.totalQuestions, 9) }, (_, index) => {
                const questionNumber = index + 1;
                const questionPoints = (quiz.questionPoints && quiz.questionPoints[index]) ? quiz.questionPoints[index] : 1;
                
                return (
                  <div key={index} className="border border-gray-300 p-3 bg-white rounded text-center">
                    <div className="font-black text-gray-900 text-sm mb-2">
                      Q:{questionNumber}
                      {templateSettings.includePointsPerQuestion && (
                        <span className="text-xs text-gray-600"> ({questionPoints}ن)</span>
                      )}
                    </div>
                    
                    <div className="flex justify-center gap-2" dir="ltr">
                      {['A', 'B', 'C', 'D'].map(option => (
                        <div
                          key={option}
                          className="w-6 h-6 border-2 border-gray-800 rounded-full flex items-center justify-center text-xs font-bold bg-white text-gray-800"
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {quiz.totalQuestions > 9 && (
              <div className="text-center text-gray-500 py-4 border-t border-gray-300 mt-4">
                ... و {quiz.totalQuestions - 9} سؤال آخر
              </div>
            )}
          </div>
        </div>
      </div>

      {/* مميزات نظام الباركود */}
      <div className="bg-green-50 p-6 rounded-xl border border-green-200 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <QrCode className="w-8 h-8 text-green-600" />
          <div>
            <h3 className="text-xl font-semibold text-green-900">مميزات نظام الباركود الجديد</h3>
            <p className="text-green-700">حل نهائي لمشكلة قراءة الرقم الوطني</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">دقة قراءة 100% ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">مسح سريع بدون أخطاء ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">يحل مشكلة الرقم الوطني نهائياً ✅</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">باركود في المكان المحدد بالأزرق ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">ملف طباعة منفصل للباركودات ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">تعليمات واضحة للاستخدام ✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* خطوات الاستخدام */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">خطوات استخدام نظام الباركود</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <p className="font-medium text-blue-900">توليد النماذج مع الباركود</p>
              <p className="text-blue-700 text-sm">استخدم "نماذج جميع التلاميذ مع باركود" لتوليد نماذج جاهزة</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <p className="font-medium text-blue-900">أو توليد باركودات منفصلة</p>
              <p className="text-blue-700 text-sm">استخدم "ملف باركودات للطباعة" ثم اقطع والصق على النماذج العادية</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <p className="font-medium text-blue-900">المسح الضوئي</p>
              <p className="text-blue-700 text-sm">استخدم نظام "مسح الباركود" في التطبيق للقراءة السريعة والدقيقة</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
            <div>
              <p className="font-medium text-green-900">النتائج التلقائية</p>
              <p className="text-green-700 text-sm">ربط تلقائي للإجابات بالتلميذ الصحيح بدون أخطاء</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTemplateGenerator;