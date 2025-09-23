import * as XLSX from 'xlsx';
import { dbManager } from './database';
import { Student, AttendanceRecord, GradeRecord } from '../types';

// واجهة تفاصيل الاستيراد
export interface ImportDetails {
  totalRows: number;
  validRows: number;
  emptyRows: number;
  duplicateRows: number;
  errorRows: number;
  processedRows: number;
  skippedRows: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  column: string;
  value: any;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ImportWarning {
  row: number;
  column: string;
  value: any;
  message: string;
}

// فئة استيراد ملفات Excel
export class ExcelImporter {
  // استيراد بيانات التلاميذ من ملف Excel مع دعم التنسيق المغربي المحسن
  static async importStudents(file: File): Promise<{ students: Student[], details: ImportDetails }> {
    const workbook = await this.readExcelFile(file);
    
    console.log('🔍 بدء عملية استيراد التلاميذ مع إنشاء المستويات والأقسام أولاً...');
    
    const allStudents: Student[] = [];
    const importDetails: ImportDetails = {
      totalRows: 0,
      validRows: 0,
      emptyRows: 0,
      duplicateRows: 0,
      errorRows: 0,
      processedRows: 0,
      skippedRows: 0,
      errors: [],
      warnings: []
    };
    
    const processedNationalIds = new Set<string>();
    
    // الخطوة 1: جمع جميع المستويات والأقسام من جميع أوراق العمل أولاً
    console.log('📋 الخطوة 1: جمع المستويات والأقسام من جميع أوراق العمل...');
    const uniqueLevels = new Set<string>();
    const uniqueSections = new Map<string, string>(); // sectionName -> levelName
    
    // مسح أولي لجمع المستويات والأقسام
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;
      
      const metadata = this.extractMetadataFromSheet(worksheet);
      if (metadata.level) {
        uniqueLevels.add(metadata.level);
        if (metadata.section) {
          uniqueSections.set(metadata.section, metadata.level);
        }
      }
    }
    
    console.log('📚 المستويات المكتشفة:', Array.from(uniqueLevels));
    console.log('📖 الأقسام المكتشفة:', Array.from(uniqueSections.entries()));
    
    // الخطوة 2: إنشاء جميع المستويات أولاً
    console.log('📋 الخطوة 2: إنشاء جميع المستويات...');
    const levelIds = new Map<string, string>();
    
    for (const levelName of uniqueLevels) {
      try {
        const levelId = await (dbManager as any).getOrCreateLevel(levelName);
        levelIds.set(levelName, levelId);
        console.log(`✅ مستوى: ${levelName} → ID: ${levelId}`);
      } catch (error) {
        console.error(`❌ خطأ في إنشاء المستوى ${levelName}:`, error);
      }
    }
    
    // الخطوة 3: إنشاء جميع الأقسام مع ربطها بالمستويات
    console.log('📋 الخطوة 3: إنشاء جميع الأقسام...');
    const sectionIds = new Map<string, string>();
    
    for (const [sectionName, levelName] of uniqueSections.entries()) {
      try {
        const levelId = levelIds.get(levelName);
        if (levelId) {
          const sectionId = await (dbManager as any).getOrCreateSection(sectionName, levelId);
          sectionIds.set(`${sectionName}_${levelName}`, sectionId);
          console.log(`✅ قسم: ${sectionName} في ${levelName} → ID: ${sectionId}`);
        }
      } catch (error) {
        console.error(`❌ خطأ في إنشاء القسم ${sectionName}:`, error);
      }
    }
    
    console.log('📋 الخطوة 4: بدء معالجة التلاميذ...');
    
    // معالجة جميع أوراق العمل في الملف
    for (const sheetName of workbook.SheetNames) {
      console.log(`📋 معالجة ورقة العمل: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        importDetails.warnings.push({
          row: 0,
          column: 'N/A',
          value: sheetName,
          message: `ورقة العمل ${sheetName} فارغة أو تالفة`
        });
        continue;
      }
      
      // استخراج البيانات الوصفية من الخلايا العلوية
      const metadata = this.extractMetadataFromSheet(worksheet);
      console.log(`📊 البيانات الوصفية لورقة ${sheetName}:`, metadata);
      
      // الحصول على معرفات المستوى والقسم من الخرائط المُعدة مسبقاً
      const levelId = metadata.level ? levelIds.get(metadata.level) || '' : '';
      const sectionId = metadata.section && metadata.level ? 
        sectionIds.get(`${metadata.section}_${metadata.level}`) || '' : '';
      
      // قراءة البيانات كمصفوفة للتحكم الكامل
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1000');
      console.log(`📊 نطاق البيانات في ${sheetName}:`, range);
      
      // البداية من الصف 11 (فهرس 10)
      for (let rowIndex = 10; rowIndex <= range.e.r; rowIndex++) {
        importDetails.totalRows++;
        
        try {
          // قراءة البيانات من الأعمدة المحددة
          const nationalId = this.getCellValue(worksheet, `B${rowIndex + 1}`);
          const lastName = this.getCellValue(worksheet, `C${rowIndex + 1}`);
          const firstName = this.getCellValue(worksheet, `D${rowIndex + 1}`);
          const gender = this.getCellValue(worksheet, `E${rowIndex + 1}`);
          const dateOfBirth = this.getCellValue(worksheet, `F${rowIndex + 1}`);
          const birthPlace = this.getCellValue(worksheet, `G${rowIndex + 1}`);
          
          // استخدام البيانات الوصفية المستخرجة من الخلايا العلوية
          const section = metadata.section || this.getCellValue(worksheet, `H${rowIndex + 1}`);
          const level = metadata.level || this.getCellValue(worksheet, `I${rowIndex + 1}`);
          
          // التحقق من الصف الفارغ
          if (!nationalId && !lastName && !firstName) {
            importDetails.emptyRows++;
            continue;
          }
          
          // التحقق من البيانات الأساسية المطلوبة
          const validationErrors = this.validateStudentData({
            nationalId,
            lastName,
            firstName,
            gender
          }, rowIndex + 1);
          
          if (validationErrors.length > 0) {
            importDetails.errorRows++;
            importDetails.errors.push(...validationErrors);
            continue;
          }
          
          // التحقق من التكرار
          if (processedNationalIds.has(nationalId)) {
            importDetails.duplicateRows++;
            importDetails.warnings.push({
              row: rowIndex + 1,
              column: 'B',
              value: nationalId,
              message: `الرقم الوطني ${nationalId} مكرر في الملف`
            });
            continue;
          }
          
          processedNationalIds.add(nationalId);
          
          // إنشاء كائن التلميذ
          const student: Student = {
            id: crypto.randomUUID(),
            firstName: firstName || '',
            lastName: lastName || '',
            nationalId: nationalId,
            gender: (gender || 'ذكر') as 'ذكر' | 'أنثى',
            birthPlace: birthPlace || '',
            dateOfBirth: this.formatDate(dateOfBirth),
            email: '',
            phone: '',
            studentId: nationalId, // استخدام الرقم الوطني كرقم تلميذ افتراضي
            grade: level || '',
            section: section || '',
            level: level || '',
            // ربط المراجع (IDs) بالمستوى والقسم
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
            status: 'متمدرس' as any,
            ageGroup: this.calculateAgeGroup(this.formatDate(dateOfBirth)),
            schoolType: '',
            academicYear: metadata.academicYear || '2025/2026',
            region: metadata.region || '',
            province: metadata.province || '',
            municipality: metadata.municipality || '',
            institution: metadata.institution || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          allStudents.push(student);
          importDetails.validRows++;
          importDetails.processedRows++;
          
          console.log(`👤 تم معالجة التلميذ: ${firstName} ${lastName} - مستوى: ${level} (${levelId}) - قسم: ${section} (${sectionId})`);
          
        } catch (error) {
          importDetails.errorRows++;
          importDetails.errors.push({
            row: rowIndex + 1,
            column: 'N/A',
            value: 'N/A',
            reason: `خطأ في معالجة الصف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
            severity: 'high'
          });
        }
      }
    }
    
    console.log('📊 ملخص المستويات والأقسام المُنشأة:');
    console.log('📚 المستويات:', Array.from(levelIds.entries()));
    console.log('📖 الأقسام:', Array.from(sectionIds.entries()));
    console.log('📊 ملخص الاستيراد:', importDetails);
    return { students: allStudents, details: importDetails };
  }
  
  // استخراج البيانات الوصفية من الخلايا العلوية في ورقة العمل
  private static extractMetadataFromSheet(worksheet: XLSX.WorkSheet) {
    const metadata = {
      // البيانات من الجانب الأيسر (C5-C8)
      region: this.getCellValue(worksheet, 'C5').trim(), // الجهة/الأكاديمية
      province: this.getCellValue(worksheet, 'C6').trim(), // المديرية/الإقليم
      level: this.getCellValue(worksheet, 'C7').trim(), // المستوى
      section: this.getCellValue(worksheet, 'C8').trim(), // القسم (إذا كان موجود)
      
      // البيانات من الجانب الأيمن (G5-G7)
      municipality: this.getCellValue(worksheet, 'G5').trim(), // الجماعة
      institution: this.getCellValue(worksheet, 'G6').trim(), // المؤسسة
      academicYear: this.getCellValue(worksheet, 'G7').trim(), // السنة الدراسية
      
      // بيانات إضافية محتملة
      schoolType: this.getCellValue(worksheet, 'G8').trim(), // نوع المدرسة (إذا كان موجود)
      
      // معلومات أخرى من خلايا مختلفة
      director: this.getCellValue(worksheet, 'C9').trim(), // مدير المؤسسة
      phone: this.getCellValue(worksheet, 'G9').trim(), // هاتف المؤسسة
    };
    
    // تحويل كود المستوى إلى اسم وصفي
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
    
    // تحويل كود المستوى إلى اسم وصفي إذا كان موجوداً في الخريطة
    if (metadata.level && levelNameMap[metadata.level.toUpperCase()]) {
      metadata.level = levelNameMap[metadata.level.toUpperCase()];
    }
    
    // تنظيف البيانات وإزالة القيم الفارغة
    Object.keys(metadata).forEach(key => {
      if (!metadata[key as keyof typeof metadata] || metadata[key as keyof typeof metadata] === '') {
        delete metadata[key as keyof typeof metadata];
      }
    });
    
    return metadata;
  }
  
  // دالة مساعدة للحصول على قيمة الخلية
  private static getCellValue(worksheet: XLSX.WorkSheet, cellAddress: string): string {
    const cell = worksheet[cellAddress];
    if (!cell || cell.v === undefined || cell.v === null) {
      return '';
    }
    return String(cell.v).trim();
  }
  
  // دالة التحقق من صحة بيانات التلميذ
  private static validateStudentData(data: any, rowNumber: number): ImportError[] {
    const errors: ImportError[] = [];
    
    // التحقق من الرقم الوطني
    if (!data.nationalId || data.nationalId.trim() === '') {
      errors.push({
        row: rowNumber,
        column: 'B',
        value: data.nationalId,
        reason: 'الرقم الوطني مطلوب ولا يمكن أن يكون فارغاً',
        severity: 'high'
      });
    } else if (data.nationalId.length < 8) {
      errors.push({
        row: rowNumber,
        column: 'B',
        value: data.nationalId,
        reason: 'الرقم الوطني قصير جداً (أقل من 8 أرقام)',
        severity: 'medium'
      });
    }
    
    // التحقق من الاسم الأخير
    if (!data.lastName || data.lastName.trim() === '') {
      errors.push({
        row: rowNumber,
        column: 'C',
        value: data.lastName,
        reason: 'النسب (الاسم الأخير) مطلوب',
        severity: 'high'
      });
    }
    
    // التحقق من الاسم الأول
    if (!data.firstName || data.firstName.trim() === '') {
      errors.push({
        row: rowNumber,
        column: 'D',
        value: data.firstName,
        reason: 'الاسم الشخصي مطلوب',
        severity: 'high'
      });
    }
    
    // التحقق من النوع
    if (data.gender && !['ذكر', 'أنثى', 'M', 'F', 'Male', 'Female'].includes(data.gender)) {
      errors.push({
        row: rowNumber,
        column: 'E',
        value: data.gender,
        reason: 'النوع يجب أن يكون "ذكر" أو "أنثى"',
        severity: 'medium'
      });
    }
    
    return errors;
  }
  
  // دالة تنسيق التاريخ
  private static formatDate(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      // إذا كان التاريخ من Excel (رقم)
      if (typeof dateValue === 'number') {
        const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
        return excelDate.toISOString().split('T')[0];
      }
      
      // إذا كان التاريخ نص
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // إذا كان كائن تاريخ
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      
      return '';
    } catch (error) {
      console.warn('خطأ في تنسيق التاريخ:', dateValue, error);
      return '';
    }
  }

  // دالة مساعدة لمعالجة البيانات المستوردة
  private static processImportedData(data: any[]): Student[] {
    return data.map((row: any) => ({
      id: crypto.randomUUID(),
      firstName: row['الاسم'] || row['الاسم الشخصي'] || row['firstName'] || '',
      lastName: row['النسب'] || row['الاسم العائلي'] || row['lastName'] || '',
      nationalId: row['الرمز'] || row['الرقم الوطني'] || row['nationalId'] || '',
      gender: (row['النوع'] || row['الجنس'] || row['gender'] || 'ذكر') as 'ذكر' | 'أنثى',
      birthPlace: row['مكان الازدياد'] || row['مكان الولادة'] || row['birthPlace'] || '',
      dateOfBirth: row['تاريخ الازدياد'] || row['ت. الازدياد'] || row['تاريخ الميلاد'] || row['dateOfBirth'] || '',
      email: row['البريد الإلكتروني'] || row['email'] || '',
      phone: row['رقم الهاتف'] || row['phone'] || '',
      studentId: row['رقم التلميذ'] || row['الرقم الجامعي'] || row['studentId'] || crypto.randomUUID().substring(0, 8),
      grade: row['الصف'] || row['المستوى'] || row['grade'] || '',
      section: row['القسم'] || row['الشعبة'] || row['section'] || '',
      level: row['المستوى'] || row['level'] || '',
      enrollmentDate: row['تاريخ التسجيل'] || row['enrollmentDate'] || new Date().toISOString().split('T')[0],
      address: row['العنوان'] || row['address'] || '',
      emergencyContact: row['جهة اتصال الطوارئ'] || row['emergencyContact'] || '',
      emergencyPhone: row['هاتف الطوارئ'] || row['emergencyPhone'] || '',
      guardianName: row['اسم ولي الأمر'] || row['ولي الأمر'] || row['guardianName'] || '',
      guardianPhone: row['هاتف ولي الأمر'] || row['guardianPhone'] || '',
      guardianRelation: row['صلة القرابة'] || row['guardianRelation'] || '',
      socialSupport: Boolean(row['الدعم الاجتماعي'] || row['socialSupport'] || false),
      transportService: Boolean(row['خدمة النقل'] || row['transportService'] || false),
      medicalInfo: row['المعلومات الطبية'] || row['medicalInfo'] || '',
      notes: row['ملاحظات'] || row['notes'] || '',
      status: (row['الحالة'] || row['status'] || 'نشط') as 'نشط' | 'غير نشط' | 'متخرج' | 'منقول' | 'منسحب',
      // الحقول الجديدة للإحصائيات المتقدمة
      ageGroup: row['الفئة العمرية'] || row['ageGroup'] || this.calculateAgeGroup(row['تاريخ الازدياد'] || row['dateOfBirth']),
      schoolType: row['نوع المدرسة'] || row['schoolType'] || '',
      academicYear: row['السنة الدراسية'] || row['academicYear'] || '2025/2026',
      region: row['الجهة'] || row['المنطقة'] || row['region'] || '',
      province: row['الإقليم'] || row['العمالة'] || row['province'] || '',
      municipality: row['الجماعة'] || row['municipality'] || '',
      institution: row['المؤسسة'] || row['institution'] || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  // حساب الفئة العمرية من تاريخ الميلاد
  private static calculateAgeGroup(birthDate: string): string {
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
  }

  // استيراد بيانات الحضور من ملف Excel
  static async importAttendance(file: File): Promise<AttendanceRecord[]> {
    const workbook = await this.readExcelFile(file);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    return data.map((row: any) => ({
      id: crypto.randomUUID(),
      studentId: row['معرف التلميذ'] || row['رقم التلميذ'] || row['studentId'] || '',
      date: row['التاريخ'] || row['date'] || new Date().toISOString().split('T')[0],
      status: (row['حالة الحضور'] || row['الحالة'] || row['status'] || 'حاضر') as 'حاضر' | 'غائب' | 'متأخر' | 'معذور' | 'غياب مبرر',
      period: row['الحصة'] || row['period'] || '',
      subject: row['المادة'] || row['subject'] || '',
      notes: row['ملاحظات'] || row['notes'] || '',
      createdAt: new Date().toISOString()
    }));
  }

  // استيراد نقط المراقبة المستمرة من ملف Excel
  static async importGrades(file: File): Promise<GradeRecord[]> {
    const workbook = await this.readExcelFile(file);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    return data.map((row: any) => ({
      id: crypto.randomUUID(),
      studentId: row['معرف التلميذ'] || row['رقم التلميذ'] || row['studentId'] || '',
      subject: row['المادة'] || row['subject'] || '',
      grade: parseFloat(row['النقطة'] || row['الدرجة'] || row['grade'] || '0'),
      maxGrade: parseFloat(row['النقطة العظمى'] || row['الدرجة العظمى'] || row['maxGrade'] || '20'),
      assignmentType: (row['نوع التقييم'] || row['assignmentType'] || 'مراقبة مستمرة') as 'امتحان نهائي' | 'امتحان نصفي' | 'اختبار قصير' | 'واجب منزلي' | 'مشروع' | 'مشاركة صفية' | 'امتحان شفهي' | 'مراقبة مستمرة',
      semester: (row['الفصل الدراسي'] || row['الفصل'] || row['semester'] || 'الفصل الأول') as 'الفصل الأول' | 'الفصل الثاني' | 'الفصل الثالث',
      academicYear: row['السنة الدراسية'] || row['academicYear'] || '2025/2026',
      date: row['التاريخ'] || row['date'] || new Date().toISOString().split('T')[0],
      notes: row['ملاحظات'] || row['notes'] || '',
      createdAt: new Date().toISOString()
    }));
  }

  // قراءة ملف Excel
  private static async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}

// فئة تصدير ملفات Excel
export class ExcelExporter {
  // تصدير لوائح التلاميذ إلى ملف Excel بالتنسيق المغربي المحسن
  static exportStudents(students: Student[]): void {
    const worksheet = XLSX.utils.json_to_sheet(students.map((student, index) => ({
      'رت': index + 1,
      'الرمز': student.nationalId,
      'النسب': student.lastName,
      'الاسم': student.firstName,
      'النوع': student.gender,
      'تاريخ الازدياد': student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-CA') : '',
      'مكان الازدياد': student.birthPlace,
      'القسم': student.section,
      'المستوى': student.level,
      'الصف': student.grade,
      'الجهة': student.region,
      'الإقليم/العمالة': student.province,
      'الجماعة': student.municipality,
      'المؤسسة': student.institution,
      'السنة الدراسية': student.academicYear,
      'الفئة العمرية': student.ageGroup,
      'نوع المدرسة': student.schoolType,
      'البريد الإلكتروني': student.email,
      'رقم الهاتف': student.phone,
      'العنوان': student.address,
      'اسم ولي الأمر': student.guardianName,
      'هاتف ولي الأمر': student.guardianPhone,
      'صلة القرابة': student.guardianRelation,
      'الدعم الاجتماعي': student.socialSupport ? 'نعم' : 'لا',
      'خدمة النقل': student.transportService ? 'نعم' : 'لا',
      'المعلومات الطبية': student.medicalInfo,
      'ملاحظات': student.notes,
      'الحالة': student.status,
      'تاريخ الإنشاء': student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-CA') : '',
      'تاريخ آخر تحديث': student.updatedAt ? new Date(student.updatedAt).toLocaleDateString('en-CA') : ''
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'لائحة التلاميذ');
    XLSX.writeFile(workbook, `لائحة_التلاميذ_${new Date().toISOString().split('T')[0]}.xlsx`);
  }


  // تصدير الإحصائيات الشاملة
  static exportStatistics(stats: any, type: string): void {
    let worksheet: any;
    let filename: string;
    
    switch (type) {
      case 'levels':
        worksheet = XLSX.utils.json_to_sheet(stats.map((stat: any, index: number) => ({
          'رت': index + 1,
          'المستوى': stat.level,
          'إجمالي التلاميذ': stat.totalStudents,
          'التلاميذ الذكور': stat.maleStudents,
          'التلميذات الإناث': stat.femaleStudents,
          'متوسط النقط': stat.averageGrade,
          'معدل الحضور': `${(stat.attendanceRate * 100).toFixed(1)}%`
        })));
        filename = 'إحصائيات_المستويات';
        break;
        
      case 'grades':
        worksheet = XLSX.utils.json_to_sheet(stats.map((stat: any, index: number) => ({
          'رت': index + 1,
          'الصف': stat.grade,
          'إجمالي التلاميذ': stat.totalStudents,
          'التلاميذ الذكور': stat.maleStudents,
          'التلميذات الإناث': stat.femaleStudents,
          'متوسط النقط': stat.averageGrade,
          'معدل الحضور': `${(stat.attendanceRate * 100).toFixed(1)}%`
        })));
        filename = 'إحصائيات_الصفوف';
        break;
        
      case 'sections':
        worksheet = XLSX.utils.json_to_sheet(stats.map((stat: any, index: number) => ({
          'رت': index + 1,
          'القسم': stat.section,
          'إجمالي التلاميذ': stat.totalStudents,
          'التلاميذ الذكور': stat.maleStudents,
          'التلميذات الإناث': stat.femaleStudents,
          'متوسط النقط': stat.averageGrade,
          'معدل الحضور': `${(stat.attendanceRate * 100).toFixed(1)}%`
        })));
        filename = 'إحصائيات_الأقسام';
        break;
        
      case 'regions':
        worksheet = XLSX.utils.json_to_sheet(stats.map((stat: any, index: number) => ({
          'رت': index + 1,
          'الجهة': stat.region,
          'إجمالي التلاميذ': stat.totalStudents,
          'التلاميذ الذكور': stat.maleStudents,
          'التلميذات الإناث': stat.femaleStudents,
          'متوسط النقط': stat.averageGrade,
          'معدل الحضور': `${(stat.attendanceRate * 100).toFixed(1)}%`
        })));
        filename = 'إحصائيات_الجهات';
        break;
        
      default:
        return;
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الإحصائيات');
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}