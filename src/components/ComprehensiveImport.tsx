import React, { useState, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Layers, BookOpen, Users, X, FolderOpen, RefreshCw, Calendar, Building, Award, TrendingUp, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbManager } from '../utils/database';
import { Student } from '../types';
import ProgressBar from './ProgressBar';

interface ImportResult {
  levels: number;
  sections: number;
  students: number;
  updated: number;
  errors: string[];
  details: string[];
}

interface LevelSectionData {
  level: string;
  levelCode: string;
  section: string;
  metadata: any;
  sheetName: string;
}

const ComprehensiveImport: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2025/2026');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);
  const [progressData, setProgressData] = useState({
    progress: 0,
    status: 'idle' as 'loading' | 'success' | 'error' | 'idle',
    message: '',
    estimatedTime: 0,
    details: null as any
  });

  useEffect(() => {
    loadAcademicYears();
  }, []);

  // تحميل السنوات الدراسية
  const loadAcademicYears = async () => {
    try {
      const years = await dbManager.getAcademicYears();
      setAcademicYears(years);
      
      const currentYear = await dbManager.getCurrentAcademicYear();
      setSelectedAcademicYear(currentYear);
    } catch (error) {
      console.error('خطأ في تحميل السنوات الدراسية:', error);
    }
  };

  // خريطة تحويل الأكواد إلى أسماء وصفية
  const levelNameMap: Record<string, string> = {
    '1APIC': 'الأولى إعدادي مسار دولي',
    '2APIC': 'الثانية إعدادي مسار دولي',
    '3APIC': 'الثالثة إعدادي مسار دولي',
    'TC': 'الجذع المشترك',
    'TCS': 'الجذع المشترك العلمي',
    'TCL': 'الجذع المشترك الأدبي',
    'TCSE': 'الجذع المشترك علوم وتكنولوجيا',
    'TCLH': 'الجذع المشترك آداب وعلوم إنسانية',
    '1B': 'الأولى باكالوريا',
    '1BS': 'الأولى باكالوريا علوم',
    '1BL': 'الأولى باكالوريا آداب',
    '1BSE': 'الأولى باكالوريا علوم وتكنولوجيا',
    '1BLH': 'الأولى باكالوريا آداب وعلوم إنسانية',
    '2B': 'الثانية باكالوريا',
    '2BS': 'الثانية باكالوريا علوم',
    '2BL': 'الثانية باكالوريا آداب',
    '2BSE': 'الثانية باكالوريا علوم وتكنولوجيا',
    '2BLH': 'الثانية باكالوريا آداب وعلوم إنسانية',
    'CP': 'التحضيري',
    'CE1': 'السنة الأولى ابتدائي',
    'CE2': 'السنة الثانية ابتدائي',
    'CM1': 'السنة الثالثة ابتدائي',
    'CM2': 'السنة الرابعة ابتدائي',
    'CI': 'السنة الخامسة ابتدائي',
    'CS': 'السنة السادسة ابتدائي',
    '6AEP': 'السادسة ابتدائي',
    '1AC': 'الأولى إعدادي',
    '2AC': 'الثانية إعدادي',
    '3AC': 'الثالثة إعدادي'
  };

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

  // الحصول على قيمة الخلية
  const getCellValue = (worksheet: XLSX.WorkSheet, cellAddress: string): string => {
    const cell = worksheet[cellAddress];
    if (!cell || cell.v === undefined || cell.v === null) {
      return '';
    }
    return String(cell.v).trim();
  };

  // استخراج البيانات الوصفية من ورقة العمل
  const extractMetadataFromSheet = (worksheet: XLSX.WorkSheet) => {
    const rawLevelCode = getCellValue(worksheet, 'C7').toUpperCase();
    const sectionName = getCellValue(worksheet, 'C8');
    const levelName = levelNameMap[rawLevelCode] || rawLevelCode;

    return {
      academy: getCellValue(worksheet, 'C5'), // الأكاديمية الجهوية
      directorate: getCellValue(worksheet, 'C6'), // المديرية
      level: levelName,
      levelCode: rawLevelCode,
      section: sectionName,
      municipality: getCellValue(worksheet, 'G5'), // الجماعة
      institution: getCellValue(worksheet, 'G6'), // المؤسسة
      academicYear: getCellValue(worksheet, 'G7') || selectedAcademicYear // السنة الدراسية
    };
  };

  // تنسيق التاريخ
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    try {
      if (typeof dateValue === 'number') {
        const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
        return excelDate.toISOString().split('T')[0];
      }
      
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      
      return '';
    } catch (error) {
      console.warn('خطأ في تنسيق التاريخ:', dateValue, error);
      return '';
    }
  };

  // حساب الفئة العمرية
  const calculateAgeGroup = (birthDate: string): string => {
    if (!birthDate) return '';
    
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    
    if (age < 6) return 'أقل من 6 سنوات';
    if (age <= 11) return '6-11 سنة';
    if (age <= 14) return '12-14 سنة';
    if (age <= 17) return '15-17 سنة';
    if (age <= 22) return '18-22 سنة';
    return 'أكثر من 22 سنة';
  };

  // حفظ إعدادات المؤسسة
  const saveInstitutionSettings = async (metadata: any) => {
    try {
      await dbManager.saveInstitutionSettings({
        academy: metadata.academy,
        directorate: metadata.directorate,
        municipality: metadata.municipality,
        institution: metadata.institution,
        academicYear: metadata.academicYear,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn('تعذر حفظ إعدادات المؤسسة:', error);
    }
  };

  // الاستيراد الشامل
  const handleComprehensiveImport = async () => {
    if (files.length === 0) return;

    setLoading(true);
    const startTime = Date.now();
    setProgressData({
      progress: 0,
      status: 'loading',
      message: 'جاري تحليل الملفات...',
      estimatedTime: 0,
      details: null
    });

    try {
      console.log('🔍 بدء الاستيراد الشامل للملفات:', files.map(f => f.name));
      
      const allStudents: Student[] = [];
      const allErrors: string[] = [];
      const uniqueLevels = new Set<string>();
      const uniqueSections = new Map<string, string>(); // sectionName -> levelName
      let totalRecords = 0;
      let processedFiles = 0;
      let institutionMetadata: any = null;

      // الخطوة 1: تحليل جميع الملفات لاستخراج المستويات والأقسام
      console.log('📋 الخطوة 1: تحليل الملفات واستخراج المستويات والأقسام...');
      
      for (const file of files) {
        try {
          const workbook = await readExcelFile(file);
          
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;
            
            const metadata = extractMetadataFromSheet(worksheet);
            
            // حفظ إعدادات المؤسسة من أول ملف
            if (!institutionMetadata && metadata.academy) {
              institutionMetadata = metadata;
            }
            
            if (metadata.level) {
              uniqueLevels.add(metadata.level);
              if (metadata.section) {
                uniqueSections.set(metadata.section, metadata.level);
              }
            }

            // حساب عدد السجلات
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1000');
            for (let rowIndex = 10; rowIndex <= range.e.r; rowIndex++) {
              const nationalId = getCellValue(worksheet, `B${rowIndex + 1}`);
              if (nationalId) {
                totalRecords++;
              }
            }
          }
        } catch (error) {
          console.error(`خطأ في تحليل الملف ${file.name}:`, error);
          allErrors.push(`❌ خطأ في تحليل الملف ${file.name}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      console.log('📚 المستويات المكتشفة:', Array.from(uniqueLevels));
      console.log('📖 الأقسام المكتشفة:', Array.from(uniqueSections.entries()));

      // حفظ إعدادات المؤسسة
      if (institutionMetadata) {
        await saveInstitutionSettings(institutionMetadata);
        allErrors.push(`🏢 تم حفظ إعدادات المؤسسة: ${institutionMetadata.institution} - ${institutionMetadata.academy}`);
      }

      setProgressData({
        progress: 10,
        status: 'loading',
        message: `تم اكتشاف ${Array.from(uniqueLevels).length} مستوى و ${Array.from(uniqueSections).length} قسم`,
        estimatedTime: 0,
        details: {
          levels: Array.from(uniqueLevels).length,
          sections: Array.from(uniqueSections).length,
          students: 0,
          males: 0,
          females: 0
        }
      });

      // الخطوة 2: إنشاء جميع المستويات
      console.log('📋 الخطوة 2: إنشاء المستويات...');
      const levelIds = new Map<string, string>();
      
      for (const levelName of uniqueLevels) {
        try {
          const levelCode = Object.keys(levelNameMap).find(key => levelNameMap[key] === levelName) || levelName.substring(0, 3).toUpperCase();
          const levelId = await (dbManager as any).getOrCreateLevel(levelName, levelCode);
          levelIds.set(levelName, levelId);
          console.log(`✅ مستوى: ${levelName} → ID: ${levelId}`);
        } catch (error) {
          console.error(`❌ خطأ في إنشاء المستوى ${levelName}:`, error);
          allErrors.push(`❌ خطأ في إنشاء المستوى ${levelName}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      setProgressData({
        progress: 30,
        status: 'loading',
        message: `تم إنشاء ${Array.from(levelIds).length} مستوى`,
        estimatedTime: 0,
        details: {
          levels: Array.from(levelIds).length,
          sections: 0,
          students: 0,
          males: 0,
          females: 0
        }
      });

      // الخطوة 3: إنشاء جميع الأقسام
      console.log('📋 الخطوة 3: إنشاء الأقسام...');
      const sectionIds = new Map<string, string>();
      
      for (const [sectionName, levelName] of uniqueSections.entries()) {
        try {
          const levelId = levelIds.get(levelName);
          if (levelId) {
            const sectionCode = sectionName.substring(0, 3).toUpperCase();
            const sectionId = await (dbManager as any).getOrCreateSection(sectionName, levelId, sectionCode);
            sectionIds.set(`${sectionName}_${levelName}`, sectionId);
            console.log(`✅ قسم: ${sectionName} في ${levelName} → ID: ${sectionId}`);
          }
        } catch (error) {
          console.error(`❌ خطأ في إنشاء القسم ${sectionName}:`, error);
          allErrors.push(`❌ خطأ في إنشاء القسم ${sectionName}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      setProgressData({
        progress: 50,
        status: 'loading',
        message: `تم إنشاء ${Array.from(sectionIds).length} قسم`,
        estimatedTime: 0,
        details: {
          levels: Array.from(levelIds).length,
          sections: Array.from(sectionIds).length,
          students: 0,
          males: 0,
          females: 0
        }
      });

      // الخطوة 4: معالجة التلاميذ
      console.log('👥 الخطوة 4: معالجة التلاميذ...');
      let processedCount = 0;
      let successCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      let maleCount = 0;
      let femaleCount = 0;
      const processedNationalIds = new Set<string>();

      for (const file of files) {
        try {
          allErrors.push(`📁 معالجة الملف: ${file.name}`);
          const workbook = await readExcelFile(file);
          
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;
            
            const metadata = extractMetadataFromSheet(worksheet);
            const levelId = levelIds.get(metadata.level) || '';
            const sectionId = sectionIds.get(`${metadata.section}_${metadata.level}`) || '';
            
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1000');
            
            for (let rowIndex = 10; rowIndex <= range.e.r; rowIndex++) {
              try {
                const nationalId = getCellValue(worksheet, `B${rowIndex + 1}`);
                const lastName = getCellValue(worksheet, `C${rowIndex + 1}`);
                const firstName = getCellValue(worksheet, `D${rowIndex + 1}`);
                const gender = getCellValue(worksheet, `E${rowIndex + 1}`);
                const dateOfBirth = getCellValue(worksheet, `F${rowIndex + 1}`);
                const birthPlace = getCellValue(worksheet, `G${rowIndex + 1}`);
                
                if (!nationalId && !lastName && !firstName) {
                  continue;
                }
                
                if (!nationalId || !lastName || !firstName) {
                  errorCount++;
                  allErrors.push(`❌ بيانات ناقصة في ${file.name} - ${sheetName} - صف ${rowIndex + 1}`);
                  continue;
                }
                
                // التحقق من التكرار
                if (processedNationalIds.has(nationalId)) {
                  allErrors.push(`⚠️ تكرار: ${nationalId} في ${file.name} - ${sheetName}`);
                  continue;
                }
                
                processedNationalIds.add(nationalId);

                const student: Student = {
                  id: crypto.randomUUID(),
                  firstName: firstName,
                  lastName: lastName,
                  nationalId: nationalId,
                  gender: (gender || 'ذكر') as 'ذكر' | 'أنثى',
                  birthPlace: birthPlace,
                  dateOfBirth: formatDate(dateOfBirth),
                  email: '',
                  phone: '',
                  studentId: nationalId,
                  grade: metadata.level,
                  section: metadata.section,
                  level: metadata.level,
                  levelId: levelId,
                  sectionId: sectionId,
                  enrollmentDate: new Date().toISOString().split('T')[0],
                  address: '',
                  emergencyContact: '',
                  emergencyPhone: '',
                  guardianName: '',
                  guardianPhone: '',
                  guardianRelation: '',
                  socialSupport: false,
                  transportService: false,
                  medicalInfo: '',
                  notes: `مستورد من ${sheetName} - صف ${rowIndex + 1}`,
                  status: 'متمدرس',
                  ageGroup: calculateAgeGroup(formatDate(dateOfBirth)),
                  schoolType: '',
                  academicYear: selectedAcademicYear,
                  region: metadata.academy || '',
                  province: metadata.directorate || '',
                  municipality: metadata.municipality || '',
                  institution: metadata.institution || '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };

                // التحقق من وجود التلميذ مسبقاً
                const existingStudent = await dbManager.getStudentByNationalId(nationalId);
                
                if (existingStudent) {
                  await dbManager.updateStudent(existingStudent.id, student);
                  updatedCount++;
                  allErrors.push(`🔄 تم تحديث: ${firstName} ${lastName} - ${nationalId}`);
                } else {
                  await dbManager.addStudent(student);
                  successCount++;
                  allErrors.push(`✅ تم إضافة: ${firstName} ${lastName} - ${nationalId}`);
                }

                if (student.gender === 'ذكر') maleCount++;
                else femaleCount++;

                allStudents.push(student);
                processedCount++;

                const progress = 50 + Math.round((processedCount / totalRecords) * 50);
                const estimatedTime = totalRecords > 0 ? 
                  ((Date.now() - startTime) / processedCount) * (totalRecords - processedCount) / 1000 : 0;

                setProgressData({
                  progress,
                  status: 'loading',
                  message: `جاري معالجة ${processedCount}/${totalRecords} تلميذ...`,
                  estimatedTime,
                  details: {
                    levels: levelIds.size,
                    sections: sectionIds.size,
                    students: processedCount,
                    males: maleCount,
                    females: femaleCount
                  }
                });

                if (processedCount % 20 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 50));
                }

              } catch (error) {
                errorCount++;
                const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
                allErrors.push(`❌ خطأ في معالجة السجل في ${file.name} - ${sheetName} - صف ${rowIndex + 1}: ${errorMessage}`);
              }
            }
          }
          
          processedFiles++;
          allErrors.push(`✅ تم الانتهاء من معالجة الملف: ${file.name}`);
          
        } catch (error) {
          errorCount++;
          allErrors.push(`❌ خطأ في معالجة الملف ${file.name}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
      }

      setProgressData({
        progress: 100,
        status: 'success',
        message: 'تم الاستيراد الشامل بنجاح!',
        estimatedTime: 0,
        details: {
          levels: uniqueLevels.size,
          sections: uniqueSections.size,
          students: successCount,
          males: maleCount,
          females: femaleCount
        }
      });

      setResult({
        levels: uniqueLevels.size,
        sections: uniqueSections.size,
        students: successCount,
        updated: updatedCount,
        errors: allErrors,
        details: [
          `📊 ملخص الاستيراد:`,
          `📚 المستويات: ${uniqueLevels.size}`,
          `📖 الأقسام: ${uniqueSections.size}`,
          `👥 التلاميذ: ${successCount} جديد، ${updatedCount} محدث`,
          `👨 الذكور: ${maleCount}`,
          `👩 الإناث: ${femaleCount}`,
          `❌ الأخطاء: ${errorCount}`
        ]
      });

      // إعداد بيانات المودال الإحصائي
      setImportStats({
        levels: uniqueLevels.size,
        sections: uniqueSections.size,
        students: successCount,
        updated: updatedCount,
        males: maleCount,
        females: femaleCount,
        errors: errorCount,
        academicYear: selectedAcademicYear,
        institutionName: institutionMetadata?.institution || 'المؤسسة',
        totalProcessed: processedCount
      });
      
      // إظهار المودال بعد ثانية من انتهاء شريط التقدم
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 1000);

    } catch (error) {
      console.error('❌ خطأ في الاستيراد الشامل:', error);
      setProgressData({
        progress: 0,
        status: 'error',
        message: 'فشل في عملية الاستيراد الشامل',
        estimatedTime: 0,
        details: null
      });

      setResult({
        levels: 0,
        sections: 0,
        students: 0,
        updated: 0,
        errors: [`❌ خطأ عام: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`],
        details: []
      });
    } finally {
      setLoading(false);
    }
  };

  // تنزيل نموذج Excel
  const downloadTemplate = () => {
    const templateData = [
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', 'الأكاديمية الجهوية للتربية والتكوين', '', '', '', 'الجماعة', '', ''],
      ['', '', 'المديرية الإقليمية', '', '', '', 'المؤسسة', '', ''],
      ['', '', '1APIC', '', '', '', '2025/2026', '', ''],
      ['', '', 'علوم تجريبية', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['رت', 'الرقم الوطني', 'النسب', 'الاسم', 'النوع', 'تاريخ الازدياد', 'مكان الازدياد', '', ''],
      ['1', 'D131250967', 'أحمد', 'محمد', 'ذكر', '2005-03-15', 'الرباط', '', ''],
      ['2', 'G159046925', 'فاطمة', 'علي', 'أنثى', '2004-07-22', 'سلا', '', ''],
      ['3', 'R188026128', 'يوسف', 'حسن', 'ذكر', '2006-01-10', 'القنيطرة', '', '']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'لائحة شاملة');
    XLSX.writeFile(workbook, 'نموذج_الاستيراد_الشامل.xlsx');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* عنوان الصفحة */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            الاستيراد الشامل للوائح والمستويات والأقسام
          </h1>
          <p className="text-gray-600 text-lg">استيراد شامل للمستويات والأقسام والتلاميذ من ملفات Excel</p>
          <div className="mt-4 w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto"></div>
        </div>

        {/* إعدادات الاستيراد */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            إعدادات الاستيراد
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                السنة الدراسية *
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {academicYears.map(year => (
                  <option key={year.id} value={year.year}>
                    {year.year} {year.isActive ? '(نشطة)' : ''}
                  </option>
                ))}
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2023/2024">2023/2024</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                تحميل النموذج
              </button>
            </div>
          </div>
        </div>

        {/* معلومات العملية
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <Layers className="w-8 h-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">المستويات</h3>
            </div>
            <p className="text-blue-700 text-sm mb-4">
              استخراج المستويات من الخلية C7 وتحويل الأكواد إلى أسماء وصفية
            </p>
            <div className="text-sm text-blue-600">
              <p>✓ تحويل الأكواد (1APIC → الأولى إعدادي مسار دولي)</p>
              <p>✓ منع التكرار</p>
              <p>✓ ربط بالأقسام</p>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-8 h-8 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">الأقسام</h3>
            </div>
            <p className="text-green-700 text-sm mb-4">
              استخراج الأقسام من الخلية C8 وربطها بالمستويات المناسبة
            </p>
            <div className="text-sm text-green-600">
              <p>✓ ربط بالمستوى الصحيح</p>
              <p>✓ منع التكرار</p>
              <p>✓ إنشاء العلاقات</p>
            </div>
          </div>

          <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <Building className="w-8 h-8 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-900">إعدادات المؤسسة</h3>
            </div>
            <p className="text-purple-700 text-sm mb-4">
              استخراج بيانات المؤسسة من الخلايا المحددة وحفظها
            </p>
            <div className="text-sm text-purple-600">
              <p>✓ الأكاديمية (C5)</p>
              <p>✓ المديرية (C6)</p>
              <p>✓ الجماعة (G5)</p>
              <p>✓ المؤسسة (G6)</p>
            </div>
          </div>
        </div>    */}

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

        {/* مودال النجاح الإحصائي */}
        {showSuccessModal && importStats && (
          <SuccessModal 
            stats={importStats} 
            onClose={() => setShowSuccessModal(false)} 
          />
        )}

        {/* منطقة رفع الملفات */}
        <div className="bg-white rounded-xl p-8 shadow-sm mb-6 border border-gray-100">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">رفع ملفات اللوائح الشاملة</h3>
              <p className="text-gray-600">اختر ملفات Excel تحتوي على لوائح التلاميذ مع المستويات والأقسام</p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors duration-200">
              <div
                className={`cursor-pointer flex flex-col items-center transition-all duration-200 ${
                  dragActive ? 'scale-105 border-blue-500' : ''
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
                  id="comprehensive-file-upload"
                  multiple
                />
                <label
                  htmlFor="comprehensive-file-upload"
                  className="cursor-pointer flex flex-col items-center w-full"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-200 ${
                    dragActive ? 'bg-blue-200' : 'bg-blue-100'
                  }`}>
                    <FolderOpen className={`w-8 h-8 transition-all duration-200 ${
                      dragActive ? 'text-blue-700' : 'text-blue-600'
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
                onClick={handleComprehensiveImport}
                disabled={files.length === 0 || loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري الاستيراد الشامل...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    بدء الاستيراد الشامل ({files.length} ملف)
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
              <h3 className="text-xl font-semibold text-gray-900">نتائج الاستيراد الشامل</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">المستويات</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{result.levels}</p>
                <p className="text-xs text-purple-600">مستوى</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">الأقسام</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{result.sections}</p>
                <p className="text-xs text-green-600">قسم</p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">تلاميذ جدد</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{result.students}</p>
                <p className="text-xs text-blue-600">تلميذ</p>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">محدث</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{result.updated}</p>
                <p className="text-xs text-orange-600">تلميذ</p>
              </div>
            </div>

            {/* رسالة النجاح */}
            {(result.students > 0 || result.updated > 0) && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200 mb-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    تم الاستيراد الشامل بنجاح! 🎉
                  </h4>
                  <p className="text-gray-700 text-lg">
                    تم إنشاء {result.levels} مستوى و {result.sections} قسم واستيراد {result.students + result.updated} تلميذ
                  </p>
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

            {result.errors.length > 0 && (
              <div className="mt-4 bg-red-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                <h4 className="font-medium text-red-900 mb-3">سجل العمليات:</h4>
                <div className="space-y-1">
                  {result.errors.map((error, index) => (
                    <p key={index} className="text-sm text-gray-700">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* معلومات إضافية */}
        <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">كيفية عمل الاستيراد الشامل</h3>
          <div className="space-y-2 text-blue-800">
            <p>• <strong>الخطوة 1:</strong> تحليل جميع الملفات واستخراج المستويات   والأقسام    </p>
            <p>• <strong>الخطوة 2:</strong> إنشاء جميع المستويات الفريدة مع تحويل الأكواد إلى أسماء وصفية</p>
            <p>• <strong>الخطوة 3:</strong> إنشاء جميع الأقسام وربطها بالمستويات المناسبة</p>
            <p>• <strong>الخطوة 4:</strong> استيراد التلاميذ مع ربطهم بالمراجع الصحيحة (    )</p>
            <p>• <strong>إعدادات المؤسسة:</strong> استخراج وحفظ بيانات المؤسسة من الخلايا المحددة</p>
            <p>• <strong>منع التكرار:</strong> فحص وجود المستويات والأقسام والتلاميذ قبل الإنشاء</p>
            <p>• <strong>التحديث التلقائي:</strong> تحديث بيانات التلاميذ الموجودين بدلاً من إنشاء تكرارات</p>
            <p>• <strong>الربط الصحيح:</strong> ضمان ربط كل تلميذ بمستواه وقسمه الصحيح</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// مكون مودال النجاح الإحصائي
const SuccessModal: React.FC<{ stats: any; onClose: () => void }> = ({ stats, onClose }) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 4);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* رأس المودال */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-white text-center relative overflow-hidden">
          {/* زر الإغلاق */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200 z-20"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-50 animate-pulse"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">🎉 تم الاستيراد بنجاح!</h2>
            <p className="text-green-100">تم استيراد البيانات الشاملة بنجاح</p>
          </div>
        </div>

        {/* محتوى الإحصائيات */}
        <div className="p-4">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تقرير الاستيراد الشامل</h3>
            <p className="text-gray-600">السنة الدراسية: {stats.academicYear} | المؤسسة: {stats.institutionName}</p>
            <p className="text-sm text-gray-500">تاريخ الاستيراد: {new Date().toLocaleDateString('fr-MA', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric'
            })}</p>
          </div>

          {/* الإحصائيات الرئيسية */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 text-center transform transition-all duration-500 ${
              animationStep >= 0 ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}>
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-bold text-purple-600 mb-1">{stats.levels || 0}</div>
              <div className="text-sm font-medium text-purple-800">مستوى</div>
            </div>
            
            <div className={`bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200 text-center transform transition-all duration-500 delay-200 ${
              animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-bold text-green-600 mb-1">{stats.sections || 0}</div>
              <div className="text-sm font-medium text-green-800">قسم</div>
            </div>
            
            <div className={`bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 text-center transform transition-all duration-500 delay-400 ${
              animationStep >= 2 ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">{(stats.students || 0) + (stats.updated || 0)}</div>
              <div className="text-sm font-medium text-blue-800">تلميذ</div>
            </div>
            
            <div className={`bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 text-center transform transition-all duration-500 delay-600 ${
              animationStep >= 3 ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}>
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-bold text-orange-600 mb-1">{stats.totalProcessed || 0}</div>
              <div className="text-sm font-medium text-orange-800">سجل معالج</div>
            </div>
          </div>

          {/* تفاصيل التوزيع */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 text-center text-sm">توزيع التلاميذ</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 text-sm">جديد:</span>
                  <span className="font-bold text-blue-800 text-sm">{stats.students || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 text-sm">محدث:</span>
                  <span className="font-bold text-blue-800 text-sm">{stats.updated || 0}</span>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800 font-medium text-sm">الإجمالي:</span>
                    <span className="font-bold text-blue-900">{(stats.students || 0) + (stats.updated || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <h4 className="font-semibold text-pink-900 mb-2 text-center text-sm">توزيع النوع</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-pink-700 text-sm">الذكور:</span>
                  <span className="font-bold text-pink-800 text-sm">{stats.males || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-pink-700 text-sm">الإناث:</span>
                  <span className="font-bold text-pink-800 text-sm">{stats.females || 0}</span>
                </div>
                <div className="border-t border-pink-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-pink-800 font-medium text-sm">النسبة:</span>
                    <span className="font-bold text-pink-900 text-sm">
                      {(stats.males || 0) + (stats.females || 0) > 0 ? Math.round(((stats.males || 0) / ((stats.males || 0) + (stats.females || 0))) * 100) : 0}% ذكور
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* شريط التقدم المرئي */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2 text-center text-sm">معدل النجاح</h4>
            <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-2000 ease-out"
                style={{ width: `${(stats.totalProcessed || 0) > 0 ? Math.round((((stats.students || 0) + (stats.updated || 0)) / (stats.totalProcessed || 1)) * 100) : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>نجح: {(stats.students || 0) + (stats.updated || 0)}</span>
              <span>{(stats.totalProcessed || 0) > 0 ? Math.round((((stats.students || 0) + (stats.updated || 0)) / (stats.totalProcessed || 1)) * 100) : 0}%</span>
              <span>إجمالي: {stats.totalProcessed || 0}</span>
            </div>
          </div>

          {/* رسالة التهنئة */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-xl border border-green-200 text-center mb-4">
      
         
            <p className="text-gray-700">
              تم استيراد {stats.levels || 0} مستوى و {stats.sections || 0} قسم و {(stats.students || 0) + (stats.updated || 0)} تلميذ بنجاح
            </p>
            <p className="text-sm text-gray-600 mt-2">
              يمكنك الآن الانتقال إلى "البنية التربوية" لمراجعة الإحصائيات التفصيلية
            </p>
          </div>

          {/* زر الإغلاق */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              ممتاز! إغلاق التقرير
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveImport;