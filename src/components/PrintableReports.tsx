import React, { useState, useEffect } from 'react';
import { Printer, Download, FileText, BarChart3, Users, Calendar, Building, MapPin, Eye, RefreshCw, Plus, Minus } from 'lucide-react';
import { dbManager } from '../utils/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface ReportData {
  institutionInfo: {
    academy: string;
    directorate: string;
    municipality: string;
    institution: string;
    academicYear: string;
    reportDate: string;
  };
  levelStats: Array<{
    level: string;
    levelCode: string;
    male: number;
    female: number;
    total: number;
    percentage: number;
    sections: Array<{
      name: string;
      code: string;
      male: number;
      female: number;
      total: number;
      averagePerSection: number;
    }>;
  }>;
  sectionStats: Array<{
    sectionName: string;
    levelName: string;
    male: number;
    female: number;
    total: number;
    expectedNew: number;
    expectedTotal: number;
  }>;
  overallStats: {
    totalStudents: number;
    totalMale: number;
    totalFemale: number;
    totalLevels: number;
    totalSections: number;
    averagePerSection: number;
  };
}

const PrintableReports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2025/2026');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [showCharts, setShowCharts] = useState(false);
  const [activeReport, setActiveReport] = useState<'levels' | 'sections'>('levels');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedAcademicYear) {
      generateReportData();
    }
  }, [selectedAcademicYear]);

  // تحميل البيانات الأولية
  const loadInitialData = async () => {
    try {
      const years = await dbManager.getAcademicYears();
      setAcademicYears(years);
      
      const currentYear = await dbManager.getCurrentAcademicYear();
      setSelectedAcademicYear(currentYear);
    } catch (error) {
      console.error('خطأ في تحميل البيانات الأولية:', error);
    }
  };

  // توليد بيانات التقرير
  const generateReportData = async () => {
    setLoading(true);
    try {
      console.log('🔄 بدء تحميل بيانات التقرير للسنة:', selectedAcademicYear);
      
      // جلب جميع التلاميذ وفلترة حسب السنة
      const allStudents = await dbManager.getStudents();
      const students = allStudents.filter(s => 
        s.academicYear === selectedAcademicYear || 
        (!s.academicYear && selectedAcademicYear === '2025/2026')
      );
      
      // تصفية التلاميذ النشطين (المتمدرسين)
      const activeStudents = students.filter(s => s.status === 'متمدرس');
      console.log('✅ التلاميذ النشطين:', activeStudents.length);
      
      // استخدام حقلي SECTION و LEVEL النصيين مباشرة من جدول التلاميذ
      const uniqueCombinations = new Map<string, {
        levelName: string;
        sectionName: string;
        students: typeof activeStudents;
      }>();
      
      activeStudents.forEach(student => {
        if (student.level && student.section) {
          const key = `${student.level}_${student.section}`;
          if (!uniqueCombinations.has(key)) {
            uniqueCombinations.set(key, {
              levelName: student.level,
              sectionName: student.section,
              students: []
            });
          }
          uniqueCombinations.get(key)!.students.push(student);
        }
      });
      
      // تجميع الإحصائيات حسب المستوى
      const levelStatsMap = new Map<string, {
        level: string;
        levelCode: string;
        male: number;
        female: number;
        total: number;
        percentage: number;
        sections: Array<{
          name: string;
          code: string;
          male: number;
          female: number;
          total: number;
          averagePerSection: number;
        }>;
      }>();

      // تجميع البيانات حسب المستوى
      uniqueCombinations.forEach((data, key) => {
        const levelName = data.levelName;
        
        if (!levelStatsMap.has(levelName)) {
          levelStatsMap.set(levelName, {
            level: levelName,
            levelCode: levelName.substring(0, 5),
            male: 0,
            female: 0,
            total: 0,
            percentage: 0,
            sections: []
          });
        }
        
        const levelStats = levelStatsMap.get(levelName)!;
        
        const maleCount = data.students.filter(s => s.gender === 'ذكر').length;
        const femaleCount = data.students.filter(s => s.gender === 'أنثى').length;
        const totalCount = data.students.length;
        
        levelStats.sections.push({
          name: data.sectionName,
          code: data.sectionName.substring(0, 3),
          male: maleCount,
          female: femaleCount,
          total: totalCount,
          averagePerSection: totalCount
        });
        
        levelStats.male += maleCount;
        levelStats.female += femaleCount;
        levelStats.total += totalCount;
      });

      // حساب النسب المئوية
      const totalStudents = activeStudents.length;
      levelStatsMap.forEach(level => {
        level.percentage = totalStudents > 0 ? Math.round((level.total / totalStudents) * 100) : 0;
        level.sections.forEach(section => {
          section.averagePerSection = section.total;
        });
      });

      // إعداد بيانات الأقسام للتقرير الثاني
      const allSections = Array.from(uniqueCombinations.values()).map(data => {
        const maleCount = data.students.filter(s => s.gender === 'ذكر').length;
        const femaleCount = data.students.filter(s => s.gender === 'أنثى').length;
        const totalCount = data.students.length;
        
        return {
          sectionName: data.sectionName,
          levelName: data.levelName,
          male: maleCount,
          female: femaleCount,
          total: totalCount,
          expectedNew: 0, // للتقرير الثاني
          expectedTotal: totalCount
        };
      });

      // جلب إعدادات المؤسسة
      let institutionInfo = {
        academy: 'الأكاديمية الجهوية للتربية والتكوين',
        directorate: 'المديرية الإقليمية',
        municipality: 'الجماعة',
        institution: 'المؤسسة التعليمية',
        academicYear: selectedAcademicYear,
        reportDate: new Date().toLocaleDateString('fr-MA')
      };

      try {
        const institutionSettings = await dbManager.getInstitutionSettings();
        if (institutionSettings) {
          institutionInfo = {
            academy: institutionSettings.academy || institutionInfo.academy,
            directorate: institutionSettings.directorate || institutionInfo.directorate,
            municipality: institutionSettings.municipality || institutionInfo.municipality,
            institution: institutionSettings.institution || institutionInfo.institution,
            academicYear: institutionSettings.academicYear || selectedAcademicYear,
            reportDate: new Date().toLocaleDateString('fr-MA')
          };
        }
      } catch (error) {
        console.warn('خطأ في جلب إعدادات المؤسسة، سيتم استخدام القيم الافتراضية:', error);
      }

      const reportData: ReportData = {
        institutionInfo,
        levelStats: Array.from(levelStatsMap.values()).filter(l => l.total > 0),
        sectionStats: allSections.sort((a, b) => b.total - a.total),
        overallStats: {
          totalStudents: activeStudents.length,
          totalMale: activeStudents.filter(s => s.gender === 'ذكر').length,
          totalFemale: activeStudents.filter(s => s.gender === 'أنثى').length,
          totalLevels: levelStatsMap.size,
          totalSections: allSections.length,
          averagePerSection: allSections.length > 0 ? Math.round(activeStudents.length / allSections.length) : 0
        }
      };

      setReportData(reportData);
    } catch (error) {
      console.error('خطأ في توليد بيانات التقرير:', error);
    } finally {
      setLoading(false);
    }
  };

  // طباعة التقرير
  const handlePrint = () => {
    window.print();
  };

  // تصدير Excel ملون بنفس التصميم
  const exportColoredExcel = () => {
    if (!reportData) return;

    const workbook = XLSX.utils.book_new();

    if (activeReport === 'levels') {
      // تقرير إحصائيات المستويات الدراسية
      const levelsData = [
        // رأس التقرير
        ['إحصائيات المستويات الدراسية'],
        [`السنة الدراسية: ${reportData.institutionInfo.academicYear} | المستوى: الكل`],
        [],
        // رأس الجدول
        ['المستوى', 'ذكور', 'إناث', 'المجموع', 'النسبة %', 'عدد الأقسام', 'معدل التلميذ/القسم'],
        // بيانات المستويات
        ...reportData.levelStats.flatMap(level => [
          // صف المستوى الرئيسي
          [
            level.level,
            level.male,
            level.female,
            level.total,
            `${level.percentage}%`,
            level.sections.length,
            level.sections.length > 0 ? Math.round(level.total / level.sections.length) : 0
          ],
          // صفوف الأقسام
          ...level.sections.map(section => [
            `└ ${section.name}`,
            section.male,
            section.female,
            section.total,
            `${Math.round((section.total / reportData.overallStats.totalStudents) * 100)}%`,
            '-',
            '-'
          ])
        ]),
        // صف المجموع
        [
          'المجموع الكلي',
          reportData.overallStats.totalMale,
          reportData.overallStats.totalFemale,
          reportData.overallStats.totalStudents,
          '100%',
          reportData.overallStats.totalSections,
          reportData.overallStats.averagePerSection
        ]
      ];

      const levelsWorksheet = XLSX.utils.aoa_to_sheet(levelsData);
      
      // تطبيق التنسيق والألوان
      const range = XLSX.utils.decode_range(levelsWorksheet['!ref'] || 'A1:G100');
      
      // تنسيق رأس التقرير
      levelsWorksheet['A1'] = { 
        v: 'إحصائيات المستويات الدراسية', 
        s: { 
          font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F46E5' } },
          alignment: { horizontal: 'center' }
        }
      };
      
      levelsWorksheet['A2'] = { 
        v: `السنة الدراسية: ${reportData.institutionInfo.academicYear} | المستوى: الكل`, 
        s: { 
          font: { sz: 12, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '6366F1' } },
          alignment: { horizontal: 'center' }
        }
      };

      // تنسيق رأس الجدول
      for (let col = 0; col < 7; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
        if (!levelsWorksheet[cellAddress]) levelsWorksheet[cellAddress] = {};
        levelsWorksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '374151' } },
          alignment: { horizontal: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }

      XLSX.utils.book_append_sheet(workbook, levelsWorksheet, 'إحصائيات المستويات');
    } else {
      // تقرير تتبع الدخول المدرسي
      const sectionsData = [
        // رأس التقرير
        ['تتبع الدخول المدرسي'],
        [`السنة الدراسية: ${reportData.institutionInfo.academicYear} | المستوى: الكل`],
        [],
        // رأس الجدول
        ['المستوى', 'القسم', 'ذكور', 'إناث', 'المجموع', 'العدد المضاف أثناء عملية التسجيل', 'العدد المتوقع بالقسم بعد استقبال الوافدين'],
        // بيانات الأقسام
        ...reportData.sectionStats.map(section => [
          section.levelName,
          section.sectionName,
          section.male,
          section.female,
          section.total,
          section.expectedNew,
          section.expectedTotal
        ]),
        // صف المجموع
        [
          'المجموع الكلي',
          'جميع الأقسام',
          reportData.overallStats.totalMale,
          reportData.overallStats.totalFemale,
          reportData.overallStats.totalStudents,
          reportData.sectionStats.reduce((sum, s) => sum + s.expectedNew, 0),
          reportData.sectionStats.reduce((sum, s) => sum + s.expectedTotal, 0)
        ]
      ];

      const sectionsWorksheet = XLSX.utils.aoa_to_sheet(sectionsData);
      
      // تطبيق التنسيق والألوان للتقرير الثاني
      sectionsWorksheet['A1'] = { 
        v: 'تتبع الدخول المدرسي', 
        s: { 
          font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '059669' } },
          alignment: { horizontal: 'center' }
        }
      };

      XLSX.utils.book_append_sheet(workbook, sectionsWorksheet, 'تتبع الدخول المدرسي');
    }

    // حفظ الملف
    const fileName = activeReport === 'levels' 
      ? `إحصائيات_المستويات_الدراسية_${selectedAcademicYear}_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}.xlsx`
      : `تتبع_الدخول_المدرسي_${selectedAcademicYear}_${new Date().toLocaleDateString('fr-MA').replace(/\//g, '-')}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  // تحديث العدد المتوقع (للتقرير الثاني فقط)
  const updateExpectedNew = (sectionName: string, levelName: string, value: number) => {
    if (!reportData) return;
    
    const updatedSectionStats = reportData.sectionStats.map(section => {
      if (section.sectionName === sectionName && section.levelName === levelName) {
        const newExpectedNew = Math.max(0, value);
        return {
          ...section,
          expectedNew: newExpectedNew,
          expectedTotal: section.total + newExpectedNew
        };
      }
      return section;
    });

    setReportData(prev => prev ? {
      ...prev,
      sectionStats: updatedSectionStats
    } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">جاري تحضير التقرير...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد بيانات لإنشاء التقرير</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* أدوات التحكم - لا تظهر عند الطباعة */}
        <div className="print:hidden mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">التقارير القابلة للطباعة</h1>
                  <p className="text-gray-600">إحصائيات المستويات والأقسام مع التصميم المبهر</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                
                <button
                  onClick={() => setActiveReport('levels')}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    activeReport === 'levels' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  إحصائيات المستويات
                </button>
                
                <button
                  onClick={() => setActiveReport('sections')}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    activeReport === 'sections' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  تتبع الدخول المدرسي
                </button>
                
                <button
                  onClick={generateReportData}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  تحديث
                </button>
                
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <Printer className="w-4 h-4" />
                  طباعة
                </button>
                
                <button
                  onClick={exportColoredExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  تصدير Excel ملون
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* التقرير القابل للطباعة */}
        <div className="bg-white shadow-lg print:shadow-none print:bg-white">
          {activeReport === 'levels' ? (
            // تقرير إحصائيات المستويات الدراسية
            <div>
              {/* رأس التقرير الأول */}
              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg mb-4 print:bg-blue-800">
                  <h1 className="text-2xl font-bold mb-2">إحصائيات المستويات الدراسية</h1>
                  <p className="text-blue-100">السنة الدراسية: {reportData.institutionInfo.academicYear} | المستوى: الكل</p>
                </div>
              </div>

              {/* جدول إحصائيات المستويات */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-gray-400">
                  <thead>
                    <tr className="bg-gray-50 print:bg-gray-200">
                      <th className="border border-gray-400 px-4 py-3 text-right font-bold text-gray-700">المستوى</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-blue-700 print:text-gray-800">ذكور</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-pink-700 print:text-gray-800">إناث</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-700 bg-blue-50">المجموع</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-purple-700">النسبة %</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-green-700 bg-green-50">عدد الأقسام</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-orange-700">معدل التلميذ/القسم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.levelStats.map((level, index) => (
                      <React.Fragment key={index}>
                        {/* صف المستوى الرئيسي */}
                        <tr className="bg-blue-50 print:bg-gray-100">
                          <td className="border border-gray-400 px-4 py-3 font-bold text-gray-900">
                            {level.level}
                          </td>
                          <td className="border border-gray-400 px-6 py-4 text-center">
                            <div className="text-2xl font-bold text-blue-600 print:text-gray-800">{level.male}</div>
                          </td>
                          <td className="border border-gray-400 px-6 py-4 text-center">
                            <div className="text-2xl font-bold text-pink-600 print:text-gray-800">{level.female}</div>
                          </td>
                          <td className="border border-gray-400 px-6 py-4 text-center bg-blue-50">
                            <div className="text-2xl font-bold text-gray-900">{level.total}</div>
                          </td>
                          <td className="border border-gray-400 px-6 py-4 text-center">
                            <div className="text-lg font-bold text-purple-600 print:text-gray-800">{level.percentage}%</div>
                          </td>
                          <td className="border border-gray-400 px-6 py-4 text-center bg-green-50">
                            <div className="text-lg font-bold text-green-600 print:text-gray-800">{level.sections.length}</div>
                          </td>
                          <td className="border border-gray-400 px-6 py-4 text-center">
                            <div className="text-lg font-bold text-orange-600 print:text-gray-800">
                              {level.sections.length > 0 ? Math.round(level.total / level.sections.length) : 0}
                            </div>
                          </td>
                        </tr>
                        
                        {/* صفوف الأقسام */}
                        {level.sections.map((section, sectionIndex) => (
                          <tr key={sectionIndex} className="hover:bg-gray-25">
                            <td className="border border-gray-400 px-8 py-2 text-gray-700">
                              └ {section.name}
                            </td>
                            <td className="border border-gray-400 px-4 py-2 text-center text-blue-600 print:text-gray-700">
                              {section.male}
                            </td>
                            <td className="border border-gray-400 px-4 py-2 text-center text-red-600 print:text-gray-700">
                              {section.female}
                            </td>
                            <td className="border border-gray-400 px-4 py-2 text-center text-gray-700">
                              {section.total}
                            </td>
                            <td className="border border-gray-400 px-4 py-2 text-center text-purple-600 print:text-gray-700">
                              {Math.round((section.total / reportData.overallStats.totalStudents) * 100)}%
                            </td>
                            <td className="border border-gray-400 px-4 py-2 text-center text-gray-700">
                              -
                            </td>
                            <td className="border border-gray-400 px-4 py-2 text-center text-gray-700">
                              -
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    
                    {/* صف المجموع الكلي */}
                    <tr className="bg-gradient-to-r from-orange-100 to-green-100 print:bg-gray-200 font-bold">
                      <td className="border-2 border-gray-500 px-4 py-4 text-gray-900">
                        المجموع الكلي
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-blue-700 print:text-gray-800">
                          {reportData.overallStats.totalMale}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-pink-700 print:text-gray-800">
                          {reportData.overallStats.totalFemale}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center bg-blue-100">
                        <div className="text-2xl font-bold text-gray-900">
                          {reportData.overallStats.totalStudents}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center">
                        <div className="text-lg font-bold text-purple-700 print:text-gray-800">100%</div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center bg-green-100">
                        <div className="text-lg font-bold text-green-600 print:text-gray-800">
                          {reportData.overallStats.totalSections}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center">
                        <div className="text-lg font-bold text-orange-600 print:text-gray-800">
                          {reportData.overallStats.averagePerSection}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // تقرير تتبع الدخول المدرسي
            <div>
              {/* رأس التقرير الثاني */}
              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg mb-4 print:bg-green-800">
                  <h1 className="text-2xl font-bold mb-2">تتبع الدخول المدرسي</h1>
                  <p className="text-green-100">السنة الدراسية: {reportData.institutionInfo.academicYear} | المستوى: الكل</p>
                </div>
              </div>

              {/* جدول تتبع الدخول المدرسي */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-gray-400">
                  <thead>
                    <tr className="bg-gray-50 print:bg-gray-200">
                      <th className="border border-gray-400 px-4 py-3 text-right font-bold text-gray-700">المستوى</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-700">القسم</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-blue-700 print:text-gray-800">ذكور</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-pink-700 print:text-gray-800">إناث</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-700 bg-blue-50">المجموع</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-green-700">العدد المضاف أثناء عملية التسجيل</th>
                      <th className="border border-gray-400 px-4 py-3 text-center font-bold text-purple-700 bg-green-50">العدد المتوقع بالقسم بعد استقبال الوافدين</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sectionStats.map((section, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                        <td className="border border-gray-400 px-4 py-3 font-bold text-gray-900 bg-blue-50">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-600" />
                            {section.levelName}
                          </div>
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-center text-gray-700">
                          {section.sectionName}
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-center">
                          <div className="text-xl font-bold text-blue-600 print:text-gray-800">{section.male}</div>
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-center">
                          <div className="text-xl font-bold text-pink-600 print:text-gray-800">{section.female}</div>
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-center bg-blue-50">
                          <div className="text-xl font-bold text-gray-900">{section.total}</div>
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateExpectedNew(section.sectionName, section.levelName, section.expectedNew - 1)}
                              className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors duration-200 print:hidden"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <div className="w-12 px-2 py-1 text-center border border-gray-300 rounded font-bold text-green-600 bg-white">
                              {section.expectedNew}
                            </div>
                            <button
                              onClick={() => updateExpectedNew(section.sectionName, section.levelName, section.expectedNew + 1)}
                              className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center transition-colors duration-200 print:hidden"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-center bg-green-50">
                          <div className="text-xl font-bold text-purple-600 print:text-gray-800">{section.expectedTotal}</div>
                        </td>
                      </tr>
                    ))}
                    
                    {/* صف المجموع الكلي */}
                    <tr className="bg-gradient-to-r from-orange-100 to-green-100 print:bg-gray-200 font-bold">
                      <td className="border-2 border-gray-500 px-4 py-4 text-gray-900">
                        المجموع الكلي
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center text-gray-700">
                        جميع الأقسام
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-blue-700 print:text-gray-800">
                          {reportData.overallStats.totalMale}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center">
                        <div className="text-2xl font-bold text-pink-700 print:text-gray-800">
                          {reportData.overallStats.totalFemale}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center bg-blue-100">
                        <div className="text-2xl font-bold text-gray-900">
                          {reportData.overallStats.totalStudents}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center bg-green-100">
                        <div className="text-2xl font-bold text-green-600 print:text-gray-800">
                          {reportData.sectionStats.reduce((sum, s) => sum + s.expectedNew, 0)}
                        </div>
                      </td>
                      <td className="border-2 border-gray-500 px-4 py-4 text-center bg-purple-100">
                        <div className="text-2xl font-bold text-purple-600 print:text-gray-800">
                          {reportData.sectionStats.reduce((sum, s) => sum + s.expectedTotal, 0)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* معلومات المؤسسة */}
          <div className="mt-8 text-center text-sm text-gray-600 print:text-gray-800">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-right">
                <p><strong>الأكاديمية:</strong> {reportData.institutionInfo.academy}</p>
                <p><strong>المديرية:</strong> {reportData.institutionInfo.directorate}</p>
              </div>
              <div className="text-right">
                <p><strong>الجماعة:</strong> {reportData.institutionInfo.municipality}</p>
                <p><strong>المؤسسة:</strong> {reportData.institutionInfo.institution}</p>
              </div>
            </div>
                  {/* معلومات المؤسسة 
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p>تم إنشاء هذا التقرير بواسطة نظام إدارة التلاميذ</p>
              <p>تاريخ الإنشاء: {reportData.institutionInfo.reportDate}</p>
            </div>
                  معلومات المؤسسة */}
          </div>
        </div>
      </div>

      {/* أنماط الطباعة */}
      <style jsx>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:bg-blue-800 { background-color: #1e40af !important; color: white !important; }
          .print\\:bg-green-800 { background-color: #166534 !important; color: white !important; }
          .print\\:bg-gray-200 { background-color: #e5e7eb !important; }
          .print\\:text-gray-800 { color: #1f2937 !important; }
          .print\\:text-gray-700 { color: #374151 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:break-before-page { page-break-before: always; }
        }
      `}</style>
    </div>
  );
};

export default PrintableReports;