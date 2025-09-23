import React, { useState } from 'react';
import { Upload, Download, Key, AlertCircle, CheckCircle, FileSpreadsheet, Users, Clock, X, FolderOpen } from 'lucide-react';
import { dbManager } from '../utils/database';
import * as XLSX from 'xlsx';
import { settingsManager } from '../utils/settings';
import ProgressBar from './ProgressBar';

interface ImportResult {
  success: number;
  errors: number;
  updated: number;
  details: string[];
}

const CredentialsImport: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progressData, setProgressData] = useState({
    progress: 0,
    status: 'idle' as 'loading' | 'success' | 'error' | 'idle',
    message: '',
    estimatedTime: 0,
    details: null as any
  });

  // معالجة اختيار الملفات
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
      setResult(null);
    }
  };

  // معالجة drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
      setResult(null);
    }
  };

  // إزالة ملف من القائمة
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // مسح جميع الملفات
  const clearFiles = () => {
    setFiles([]);
    setResult(null);
  };

  // معالجة استيراد الأكواد السرية
  const handleImport = async () => {
    if (files.length === 0) return;

    setImporting(true);
    const startTime = Date.now();
    setProgressData({
      progress: 0,
      status: 'loading',
      message: 'جاري قراءة ملف الأكواد السرية...',
      estimatedTime: 0,
      details: null
    });

    try {
      console.log('بدء قراءة الملفات:', files.map(f => f.name));
      
      let totalSuccess = 0;
      let totalErrors = 0;
      let totalUpdated = 0;
      const allDetails: string[] = [];
      let totalRecords = 0;
      let processedFiles = 0;

      // حساب إجمالي السجلات من جميع الملفات
      for (const file of files) {
        try {
          const workbook = await readExcelFile(file);
          
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const settings = settingsManager.getCredentialsImportSettings();
            
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1000');
            range.s.r = settings.startRow - 1;
            
            const data = XLSX.utils.sheet_to_json(worksheet, {
              range: range,
              header: 1,
              defval: ''
            });

            const validRows = data.filter((row: any) => 
              row[1] && row[5] && 
              String(row[1]).trim() !== '' && 
              String(row[5]).trim() !== ''
            );

            totalRecords += validRows.length;
          }
        } catch (error) {
          console.warn(`خطأ في قراءة الملف ${file.name}:`, error);
        }
      }

      console.log('إجمالي السجلات المتوقعة:', totalRecords);

      setProgressData(prev => ({
        ...prev,
        message: `جاري معالجة ${totalRecords} سجل من ${files.length} ملف...`,
        details: {
          total: totalRecords,
          processed: 0,
          success: 0,
          updated: 0,
          errors: 0
        }
      }));

      if (totalRecords === 0) {
        setProgressData({
          progress: 100,
          status: 'error',
          message: 'لم يتم العثور على بيانات صالحة في الملفات',
          estimatedTime: 0,
          details: null
        });

        setResult({
          success: 0,
          errors: 1,
          updated: 0,
          details: ['❌ لم يتم العثور على بيانات صالحة في الملفات المحددة']
        });
        return;
      }

      let processedCount = 0;

      // معالجة جميع الملفات
      for (const file of files) {
        try {
          allDetails.push(`📁 معالجة الملف: ${file.name}`);
          const workbook = await readExcelFile(file);
          
          // معالجة جميع أوراق العمل في الملف
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const settings = settingsManager.getCredentialsImportSettings();
            
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1000');
            range.s.r = settings.startRow - 1;
            
            const data = XLSX.utils.sheet_to_json(worksheet, {
              range: range,
              header: 1,
              defval: ''
            });

            allDetails.push(`📋 معالجة ورقة العمل: ${sheetName} من ${file.name}`);

            // معالجة كل صف
            for (const [rowIndex, row] of data.entries()) {
              try {
                const studentIdIndex = settingsManager.columnToIndex(settings.studentIdColumn);
                const secretCodeIndex = settingsManager.columnToIndex(settings.secretCodeColumn);
                
                const studentId = String(row[studentIdIndex] || '').trim();
                const secretCode = String(row[secretCodeIndex] || '').trim();

                if (!studentId || !secretCode) {
                  continue;
                }

                processedCount++;
                const progress = Math.round((processedCount / totalRecords) * 100);
                const estimatedTime = totalRecords > 0 ? 
                  ((Date.now() - startTime) / processedCount) * (totalRecords - processedCount) / 1000 : 0;

                const existingStudent = await dbManager.getStudentByStudentId(studentId);
                
                if (!existingStudent) {
                  totalErrors++;
                  allDetails.push(`❌ التلميذ برقم ${studentId} غير موجود في قاعدة البيانات الرئيسية (${file.name} - ${sheetName})`);
                  
                  setProgressData({
                    progress,
                    status: 'loading',
                    message: `جاري معالجة ${processedCount}/${totalRecords} كود سري...`,
                    estimatedTime,
                    details: {
                      total: totalRecords,
                      processed: processedCount,
                      success: totalSuccess,
                      updated: totalUpdated,
                      errors: totalErrors
                    }
                  });
                  continue;
                }

                const existingCredential = await dbManager.getCredentialByStudentId(studentId);
                
                await dbManager.addOrUpdateCredential({
                  student_id: studentId,
                  secret_code: secretCode,
                  issue_date: new Date().toISOString().split('T')[0]
                });

                if (existingCredential) {
                  totalUpdated++;
                  allDetails.push(`🔄 تم تحديث الكود السري للتلميذ: ${existingStudent.firstName} ${existingStudent.lastName} - ${studentId} (${file.name} - ${sheetName})`);
                } else {
                  totalSuccess++;
                  allDetails.push(`✅ تم إضافة كود سري للتلميذ: ${existingStudent.firstName} ${existingStudent.lastName} - ${studentId} (${file.name} - ${sheetName})`);
                }

                setProgressData({
                  progress,
                  status: 'loading',
                  message: `جاري معالجة ${processedCount}/${totalRecords} كود سري...`,
                  estimatedTime,
                  details: {
                    total: totalRecords,
                    processed: processedCount,
                    success: totalSuccess,
                    updated: totalUpdated,
                    errors: totalErrors
                  }
                });

                if (processedCount % 10 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 50));
                }

              } catch (error) {
                totalErrors++;
                const studentId = String(row[1] || '').trim();
                allDetails.push(`❌ خطأ في معالجة الكود السري للتلميذ ${studentId} (${file.name} - ${sheetName}): ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
              }
            }

            allDetails.push(`📊 ورقة ${sheetName} من ${file.name}: ${totalSuccess} جديد، ${totalUpdated} محدث، ${totalErrors} خطأ`);
          }
          
          processedFiles++;
          allDetails.push(`✅ تم الانتهاء من معالجة الملف: ${file.name}`);
          
        } catch (error) {
          totalErrors++;
          allDetails.push(`❌ خطأ في معالجة الملف ${file.name}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      // تحديث حالة النجاح
      setProgressData({
        progress: 100,
        status: 'success',
        message: 'تم استيراد الأكواد السرية بنجاح!',
        estimatedTime: 0,
        details: {
          total: totalRecords,
          processed: totalRecords,
          success: totalSuccess,
          updated: totalUpdated,
          errors: totalErrors
        }
      });

      setResult({
        success: totalSuccess,
        errors: totalErrors,
        updated: totalUpdated,
        details: allDetails
      });

    } catch (error) {
      console.error('خطأ في استيراد الأكواد السرية:', error);
      
      setProgressData({
        progress: 0,
        status: 'error',
        message: 'حدث خطأ أثناء استيراد الأكواد السرية',
        estimatedTime: 0,
        details: null
      });

      setResult({
        success: 0,
        errors: 1,
        updated: 0,
        details: [`❌ خطأ في قراءة الملفات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`]
      });
    } finally {
      setImporting(false);
    }
  };

  // قراءة ملف Excel
  const readExcelFile = (file: File): Promise<XLSX.WorkBook> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // تنزيل نموذج Excel
  const downloadTemplate = () => {
    const settings = settingsManager.getCredentialsImportSettings();
    
    const templateData = [
      // صفوف فارغة حتى الصف المحدد في الإعدادات
      ...Array(settings.startRow - 1).fill([]),
      // الصف المحدد - البيانات الفعلية
      ['رت', 'الرقم الوطني', 'النسب', 'الاسم', 'النوع', 'الكود السري', 'ملاحظات'],
      ['1', 'D131250967', 'أحمد', 'محمد', 'ذكر', 'Tebu6250', ''],
      ['2', 'G159046925', 'فاطمة', 'علي', 'أنثى', 'Xplo4521', ''],
      ['3', 'R188026128', 'يوسف', 'حسن', 'ذكر', 'Mnbv7890', '']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الأكواد السرية');
    XLSX.writeFile(workbook, 'نموذج_الأكواد_السرية.xlsx');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* عنوان الصفحة */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            استيراد الأكواد السرية للتلاميذ
          </h1>
          <p className="text-gray-600 text-lg">استيراد الأكواد السرية من ملفات Excel وربطها بالتلاميذ الموجودين</p>
          <div className="mt-4 w-24 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mx-auto"></div>
        </div>

        {/* بطاقات المعلومات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <Key className="w-8 h-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">تنسيق الملف</h3>
            </div>
            <p className="text-blue-700 text-sm mb-4">
              رقم التلميذ في العمود {settingsManager.getCredentialsImportSettings().studentIdColumn}{settingsManager.getCredentialsImportSettings().startRow}، 
              الكود السري في العمود {settingsManager.getCredentialsImportSettings().secretCodeColumn}{settingsManager.getCredentialsImportSettings().startRow}
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              تحميل النموذج
            </button>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-8 h-8 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">التحقق من البيانات</h3>
            </div>
            <p className="text-green-700 text-sm mb-4">
              سيتم التحقق من وجود التلاميذ في قاعدة البيانات الرئيسية قبل إضافة الأكواد
            </p>
            <div className="text-sm text-green-600">
              <p>✓ التحقق من رقم التلميذ</p>
              <p>✓ تجاهل الخلايا الفارغة</p>
              <p>✓ ربط بقاعدة البيانات الرئيسية</p>
            </div>
          </div>

          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-900">المعالجة التلقائية</h3>
            </div>
            <p className="text-purple-700 text-sm mb-4">
              إضافة أو تحديث الأكواد السرية تلقائياً مع تاريخ الإصدار
            </p>
            <div className="text-sm text-purple-600">
              <p>البداية: الصف 11</p>
              <p>النهاية: آخر صف بالملف</p>
              <p>معالجة جميع الأوراق</p>
            </div>
          </div>
        </div>

        {/* منطقة رفع الملف */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-6 border border-gray-100">
          {/* شريط التقدم */}
          {progressData.status !== 'idle' && (
            <div className="mb-6">
              <ProgressBar
                progress={progressData.progress}
                status={progressData.status}
                message={progressData.message}
                estimatedTime={progressData.estimatedTime}
                details={progressData.details}
              />
            </div>
          )}

          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">رفع ملف الأكواد السرية</h3>
              <p className="text-gray-600">اختر ملف Excel يحتوي على الأكواد السرية للتلاميذ</p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-purple-400 transition-colors duration-200">
              <div
                className={`cursor-pointer flex flex-col items-center transition-all duration-200 ${
                  dragActive ? 'scale-105 border-purple-500' : ''
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="credentials-file-upload"
                  multiple
                />
                <label
                  htmlFor="credentials-file-upload"
                  className="cursor-pointer flex flex-col items-center w-full"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-200 ${
                    dragActive ? 'bg-purple-200' : 'bg-purple-100'
                  }`}>
                    <FolderOpen className={`w-8 h-8 transition-all duration-200 ${
                      dragActive ? 'text-purple-700' : 'text-purple-600'
                    }`} />
                  </div>
                  <span className="text-lg font-medium text-gray-700 mb-2">
                    انقر لاختيار ملفات Excel أو اسحبها وأفلتها هنا
                  </span>
                  <span className="text-sm text-gray-500">
                    يمكنك اختيار عدة ملفات دفعة واحدة
                  </span>
                </label>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">
                    الملفات المحددة ({files.length})
                  </h4>
                  <button
                    onClick={clearFiles}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    مسح الكل
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} ميجابايت
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleImport}
                disabled={files.length === 0 || importing}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 mx-auto"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري الاستيراد...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    بدء استيراد الأكواد ({files.length} ملف)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* نتائج الاستيراد */}
        {result && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">نتائج استيراد الأكواد السرية</h3>
            </div>
            
            {/* ملخص النتائج */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {result.success > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">جديد</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{result.success}</p>
                  <p className="text-xs text-green-600">كود سري</p>
                </div>
              )}
              
              {result.updated > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">محدث</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{result.updated}</p>
                  <p className="text-xs text-blue-600">كود سري</p>
                </div>
              )}
              
              {result.errors > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">فشل</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                  <p className="text-xs text-red-600">كود سري</p>
                </div>
              )}
            </div>

            {/* رسالة تلخيصية */}
            {(result.success > 0 || result.updated > 0) && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200 mb-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    تم استيراد الأكواد السرية بنجاح! 🔐
                  </h4>
                  <p className="text-gray-700 text-lg">
                    {'تم معالجة الأكواد السرية بنجاح: '}
                    {result.success > 0 && (
                      <span className="font-bold text-green-600"> {result.success} كود جديد</span>
                    )}
                    {result.updated > 0 && (
                      <> {' و '}<span className="font-bold text-blue-600">{result.updated} كود محدث</span></>
                    )}
                  </p>
                  {result.errors > 0 && (
                    <p className="text-red-600 mt-2">
                      مع <span className="font-bold">{result.errors}</span> كود تعذرت معالجته
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-3">تفاصيل العملية:</h4>
              <div className="space-y-1">
                {result.details.map((detail, index) => (
                  <p key={index} className="text-sm text-gray-700">
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="mt-8 bg-purple-50 p-6 rounded-xl border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">ملاحظات مهمة</h3>
          <div className="space-y-2 text-purple-800">
            <p>• يمكنك اختيار عدة ملفات Excel دفعة واحدة باستخدام خاصية drag and drop</p>
            <p>• سيتم معالجة جميع الملفات وجميع أوراق العمل في كل ملف</p>
            <p>• رقم التلميذ يجب أن يكون في العمود {settingsManager.getCredentialsImportSettings().studentIdColumn} بدءاً من الصف {settingsManager.getCredentialsImportSettings().startRow}</p>
            <p>• الكود السري يجب أن يكون في العمود {settingsManager.getCredentialsImportSettings().secretCodeColumn} بدءاً من الصف {settingsManager.getCredentialsImportSettings().startRow}</p>
            <p>• سيتم التحقق من وجود التلميذ في قاعدة البيانات الرئيسية قبل إضافة الكود</p>
            <p>• سيتم تخطي الصفوف الفارغة أو غير المكتملة</p>
            <p>• إذا كان للتلميذ كود سري موجود، سيتم تحديثه بالكود الجديد</p>
            <p>• تاريخ الإصدار سيكون تاريخ اليوم تلقائياً</p>
            <p>• <strong>يتم الربط بناءً على قاعدة بيانات التلاميذ الرئيسية فقط</strong></p>
            <p>• يمكن تخصيص نقاط البداية من إعدادات البرنامج</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialsImport;