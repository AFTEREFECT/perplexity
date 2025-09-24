import initSqlJs from 'sql.js';


const levelId = window.crypto.randomUUID();

// أنواع البيانات للجداول الجديدة
interface Level {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}
 
interface Section {
  id: string;
  name: string;
  levelId: string; ////////////////////////////////////////////////////////////////////////////////////////
  code: string;
  createdAt: string;
}

interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

interface Class {
  id: string;
  name: string;
  levelId: string; ///////////////////////////////////////////////////////////////////////////////////////////////////////
  code: string;
  createdAt: string;
}

class DatabaseManager {
  private db: any = null;
  private isInitialized = false;
  private dbName = 'StudentManagementDB';
  private dbVersion = 1;
  private storeName = 'database';

  async initialize() {
    if (this.isInitialized) return;

    try {
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // محاولة تحميل قاعدة البيانات من IndexedDB
      const savedDb = await this.loadFromIndexedDB();
      if (savedDb) {
        this.db = new SQL.Database(savedDb);
      } else {
        this.db = new SQL.Database();
      }

      await this.createTables();
      this.isInitialized = true;
      console.log('تم تهيئة قاعدة البيانات بنجاح');
    } catch (error) {
      console.error('خطأ في تهيئة قاعدة البيانات:', error);
      throw error;
    }
  }

// خريطة المستويات
private levelNameMap: Record<string, string> = {
  '1APIC': 'الأولى إعدادي مسار دولي',
  '2APIC': 'الثانية إعدادي مسار دولي',
  '3APIC': 'الثالثة إعدادي مسار دولي',
  'TC': 'الجذع المشترك',
  'TCS': 'الجذع المشترك العلمي',
  'TCL': 'الجذع المشترك الأدبي',
  '1B': 'الأولى باكالوريا',
  '1BS': 'الأولى باكالوريا علوم',
  '1BL': 'الأولى باكالوريا آداب',
  '2B': 'الثانية باكالوريا',
  '2BL': 'الثانية باكالوريا آداب',
  'CP': 'التحضيري',
  'CE1': 'السنة الأولى ابتدائي',
  'CE2': 'السنة الثانية ابتدائي',
  'CM1': 'السنة الثالثة ابتدائي',
  'CM2': 'السنة الرابعة ابتدائي',
  'CI': 'السنة الخامسة ابتدائي',
  'CS': 'السنة السادسة ابتدائي'
};

// جلب المستويات
getAllLevels(): Level[] {
  const stmt = this.db.prepare('SELECT * FROM levels');
  const levels: Level[] = [];
  while (stmt.step()) {
    levels.push(stmt.getAsObject() as Level);
  }
  stmt.free();
  return levels;
}

// جلب الأقسام
getAllSections(): Class[] {
  const stmt = this.db.prepare('SELECT * FROM sections');
  const sections: Class[] = [];
  while (stmt.step()) {
  sections.push(stmt.getAsObject() as Class);
  }
  stmt.free();
  return sections;
}
///////////////
 
  
// دالة إنشاء أو جلب القسم

 
async getOrCreateLevel(levelName: string, levelCode: string): Promise<{ id: string, name: string, code: string }> {
  await this.initialize();

  const cleanName = levelName.trim();
  const cleanCode = levelCode.trim().toUpperCase();

  this.db.run(`
    CREATE TABLE IF NOT EXISTS levels (
      id TEXT PRIMARY KEY,
      name TEXT,
      code TEXT
    );
  `);

  const stmt = this.db.prepare("SELECT * FROM levels WHERE name = ? AND code = ?");
  stmt.bind([cleanName, cleanCode]);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return { id: row.id as string, name: row.name as string, code: row.code as string };
  }
  stmt.free();

  // 🛠️ إذا لم يُوجد → نقوم بإنشائه
  const newId = crypto.randomUUID();
  const insertStmt = this.db.prepare("INSERT INTO levels (id, name, code) VALUES (?, ?, ?)");
  insertStmt.run([newId, cleanName, cleanCode]);
  insertStmt.free();
return { id: newId, name: cleanName, code: cleanCode };
}





    



 
 
  // الحصول على أو إنشاء قسم
  async getOrCreateSection(sectionName: string, levelId: string): Promise<string> {
    try {
      const cleanSectionName = sectionName.trim();
      
      // البحث عن القسم الموجود في نفس المستوى
      const stmt = this.db.prepare('SELECT id FROM sections WHERE name = ? AND levelId = ?');
      const existingSection = stmt.get(cleanSectionName, levelId);
      stmt.free();
      
      if (existingSection) {
        return (existingSection as any).id;
      }
       
      // إنشاء قسم جديد
      const sectionId = crypto.randomUUID();
      const insertStmt = this.db.prepare(`
        INSERT INTO sections (id, name, levelId, createdAt) 
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run(sectionId, cleanSectionName, levelId, new Date().toISOString());
      insertStmt.free();
      
      console.log(`✅ تم إنشاء قسم جديد: ${cleanSectionName} في المستوى ${levelId} - ID: ${sectionId}`);
      return sectionId;
      
    } catch (error) {
      console.error('خطأ في إنشاء القسم:', error);
      throw error;
    }
  }   

  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get('data');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.data) {
            resolve(new Uint8Array(result.data));
          } else {
            resolve(null);
          }
        };
      });
    } catch (error) {
      console.warn('خطأ في تحميل البيانات من IndexedDB:', error);
      return null;
    }
  }

  private async saveToIndexedDB(data: Uint8Array): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.put({ data: Array.from(data) }, 'data');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('خطأ في حفظ البيانات إلى IndexedDB:', error);
      throw error;
    }
  }

  private async createTables() {
    const tables = [
      // جدول المستويات
      `CREATE TABLE IF NOT EXISTS levels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        code TEXT,
        createdAt TEXT NOT NULL
      )`,

      // جدول الأقسام
      `CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        levelId TEXT,
        code TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (levelId) REFERENCES levels(id)
      )`,

      // جدول السنوات الدراسية
      `CREATE TABLE IF NOT EXISTS academic_years (
        id TEXT PRIMARY KEY,
        year TEXT NOT NULL UNIQUE,
        startDate TEXT,
        endDate TEXT,
        isActive BOOLEAN DEFAULT 0,
        createdAt TEXT NOT NULL
      )`,

      // جدول التلاميذ المحدث
      `CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        nationalId TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('ذكر', 'أنثى')) NOT NULL,
        birthPlace TEXT,
        dateOfBirth TEXT,
        email TEXT,
        phone TEXT,
        studentId TEXT UNIQUE,
        grade TEXT,
        section TEXT,
        level TEXT,
        levelId TEXT,
        sectionId TEXT,
        enrollmentDate TEXT NOT NULL,
        address TEXT,
        emergencyContact TEXT,
        emergencyPhone TEXT,
        guardianName TEXT,
        guardianPhone TEXT,
        guardianRelation TEXT,
        socialSupport BOOLEAN DEFAULT 0,
        transportService BOOLEAN DEFAULT 0,
        medicalInfo TEXT,
        notes TEXT,
        status TEXT CHECK(status IN ('نشط', 'غير نشط', 'متخرج', 'منقول', 'منسحب', 'متمدرس', 'منقطع', 'مفصول', 'غير ملتحق')) DEFAULT 'نشط',
        ageGroup TEXT,
        schoolType TEXT,
        academicYear TEXT,
        region TEXT,
        province TEXT,
        municipality TEXT,
        institution TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (levelId) REFERENCES levels(id),
        FOREIGN KEY (sectionId) REFERENCES sections(id),
        FOREIGN KEY (academicYear) REFERENCES academic_years(year)
      )`,

      // جدول سجلات الحضور
      `CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT CHECK(status IN ('حاضر', 'غائب', 'متأخر', 'معذور', 'غياب مبرر')) NOT NULL,
        period TEXT,
        subject TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
      )`,

      // جدول نقط المراقبة المستمرة
      `CREATE TABLE IF NOT EXISTS grade_records (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade REAL NOT NULL,
        maxGrade REAL NOT NULL DEFAULT 20,
        assignmentType TEXT CHECK(assignmentType IN ('امتحان نهائي', 'امتحان نصفي', 'اختبار قصير', 'واجب منزلي', 'مشروع', 'مشاركة صفية', 'امتحان شفهي', 'مراقبة مستمرة')) NOT NULL,
        semester TEXT CHECK(semester IN ('الفصل الأول', 'الفصل الثاني', 'الفصل الثالث')),
        academicYear TEXT,
        date TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
      )`,

      // جدول الأكواد السرية
      `CREATE TABLE IF NOT EXISTS credentials (
        student_id TEXT PRIMARY KEY,
        secret_code TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(nationalId) ON DELETE CASCADE
      )`,

      // إنشاء جدول إحصائيات التوجيه
      `CREATE TABLE IF NOT EXISTS guidance_statistics (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        student_id TEXT NOT NULL,
        assigned_stream TEXT,
        gender TEXT,
        decision TEXT,
        academic_year TEXT,
        level TEXT,
        section TEXT,
        age INTEGER,
        ageGroup TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(nationalId)
      )`,

      // الجداول الإضافية حسب المخطط
      `CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        level_id TEXT,
        academic_year_id TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (level_id) REFERENCES levels(id),
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
      )`,

      `CREATE TABLE IF NOT EXISTS council_decisions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        national_id TEXT,
        decision TEXT CHECK(decision IN ('ينتقل', 'يكرر', 'يفصل', 'إعادة إدماج', 'تنويه', 'تشجيع', 'لوحة الشرف', 'تنبيه', 'إنذار', 'توبيخ')) NOT NULL,
        source_metric TEXT,
        value REAL,
        generated BOOLEAN DEFAULT 0,
        note TEXT,
        decision_date TEXT NOT NULL,
        desired_stream TEXT,
        age INTEGER,
        level TEXT,
        section TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS dropouts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        dropout_date TEXT NOT NULL,
        reason TEXT,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS reintegration (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        reintegration_date TEXT NOT NULL,
        previous_status TEXT,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS parents (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        relation TEXT CHECK(relation IN ('أب', 'أم', 'مكلف', 'ولي')) NOT NULL,
        parent_name TEXT NOT NULL,
        phone_1 TEXT,
        phone_2 TEXT,
        address TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        exam_type TEXT CHECK(exam_type IN ('محلي', 'جهوي', 'وطني')) NOT NULL,
        grade_value REAL NOT NULL,
        max_grade REAL NOT NULL DEFAULT 20,
        exam_date TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS averages (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        term TEXT CHECK(term IN ('1', '2', 'سنوي')) NOT NULL,
        average_value REAL NOT NULL,
        academic_year TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_year) REFERENCES academic_years(year)
      )`,

      `CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        transfer_type TEXT CHECK(transfer_type IN ('وافد', 'مغادر')) NOT NULL,
        from_school TEXT,
        to_school TEXT,
        to_province TEXT,
        to_academy TEXT,
        transfer_date TEXT NOT NULL,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS absentees (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        status_date TEXT NOT NULL,
        note TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      // جدول المفصولين
      `CREATE TABLE IF NOT EXISTS dismissed_students (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        dismissal_date TEXT NOT NULL,
        reason TEXT,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )`,

      // جدول التلاميذ غير الملتحقين
      `CREATE TABLE IF NOT EXISTS unenrolled_students (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        lastName TEXT NOT NULL,
        firstName TEXT NOT NULL,
        gender TEXT,
        dateOfBirth TEXT,
        birthPlace TEXT,
        metadata TEXT,
        createdAt TEXT NOT NULL
      )`
    ];

    for (const tableSQL of tables) {
      this.db.run(tableSQL);
    }

    // إنشاء فهارس لتحسين الأداء
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_students_nationalId ON students(nationalId)',
      'CREATE INDEX IF NOT EXISTS idx_students_levelId ON students(levelId)',
      'CREATE INDEX IF NOT EXISTS idx_students_sectionId ON students(sectionId)',
      'CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_studentId ON attendance_records(studentId)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date)',
      'CREATE INDEX IF NOT EXISTS idx_grades_studentId ON grade_records(studentId)',
      'CREATE INDEX IF NOT EXISTS idx_grades_subject ON grade_records(subject)',
      'CREATE INDEX IF NOT EXISTS idx_sections_levelId ON sections(levelId)'
    ];

    for (const indexSQL of indexes) {
      this.db.run(indexSQL);
    }

    await this.saveDatabase();
  }
////////////////////// levelssssssssssssssssssssssssss
  // إدارة المستويات
  async addLevel(level: Omit<Level, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(
      'INSERT INTO levels (id, name, code, createdAt) VALUES (?, ?, ?, ?)',
      [id, level.name, level.code || '', createdAt]
    );
    
    await this.saveDatabase();
    return id;
  }

  // الحصول على قسم أو إنشاؤه إن لم يوجد
  async getOrCreateSection(sectionName: string, levelId: string, sectionCode: string = ''): Promise<string> {
    if (!this.db) {
      await this.initialize();
    }
    
    if (!this.db) {
      throw new Error('فشل في تهيئة قاعدة البيانات');
    }

    try {
      // التحقق من وجود القسم
      const stmt = this.db.prepare('SELECT id FROM sections WHERE name = ? AND levelId = ?');
      stmt.bind([sectionName, levelId]);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result.id;
      }
      stmt.free();

      // إنشاء قسم جديد
 
/////////////////////////////////////////

const insertStmt = this.db.prepare(
  'INSERT INTO sections (id, name, levelId, code, createdAt) VALUES (?, ?, ?, ?, ?)'
);

const id = crypto.randomUUID();
const now = new Date().toISOString();

insertStmt.run([id, sectionName, levelId, sectionCode || '', now]);


/////////////////////////////////////////

  
      insertStmt.free();
      return id;
    } catch (error) {
      console.error('خطأ في إنشاء/جلب القسم:', error);
      throw error;
    }
  }
   

  async getOrCreateSection(name: string, levelId: string, code: string = ''): Promise<[string, boolean]> {
    if (!this.db) {
      throw new Error('قاعدة البيانات غير مهيأة.');
    }

    let wasCreated = false;

    // التحقق مما إذا كان القسم موجودًا بالفعل
    const existingSection = this.db.prepare('SELECT id FROM sections WHERE name = ? AND levelId = ?').get(name, levelId) as { id: string } | undefined;

    if (existingSection) {
      return [existingSection.id, wasCreated];
    } else {
      wasCreated = true;
      // إذا لم يكن موجودًا، قم بإنشائه
      const newSectionId = crypto.randomUUID();
      const stmt = this.db.prepare('INSERT INTO sections (id, name, levelId, code, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run(newSectionId, name, levelId, code, new Date().toISOString(), new Date().toISOString());
      return [newSectionId, wasCreated];
    }
  }

  // الحصول على جميع المستويات
  async getLevels(): Promise<{ id: string; code: string; name: string; createdAt: string }[]> {
    if (!this.db) {
      console.warn('قاعدة البيانات غير مهيأة في getLevels');
      return [];
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM levels ORDER BY name');
      const rows: Level[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Level);
      }
      stmt.free();
      return rows;
    } catch (error) {
      console.error('خطأ في جلب المستويات:', error);
      return [];
    }
  }

  async getLevelByName(name: string): Promise<Level | null> {
    const stmt = this.db.prepare('SELECT * FROM levels WHERE name = ?');
    try {
      stmt.bind([name]);
      
      if (stmt.step()) {
        return stmt.getAsObject() as Level;
      }
      
      return null;
    } finally {
      stmt.free();
    }
  }

  // إدارة الأقسام
  async addSection(section: Omit<Section, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(
      'INSERT INTO sections (id, name, levelId, code, createdAt) VALUES (?, ?, ?, ?, ?)',
      [id, section.name, section.levelId, section.code || '', createdAt]
    );
    
    await this.saveDatabase();
    return id;
  }

  // الحصول على جميع الأقسام
  async getSections(): Promise<{ id: string; name: string; levelId: string; createdAt: string }[]> {
    if (!this.db) {
      console.warn('قاعدة البيانات غير مهيأة في getSections');
      return [];
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM sections ORDER BY name');
      const sections: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        sections.push({
          class_id: row.id,
          class_name: row.name,
          level_id: row.levelId
        } as Class);
      }
      stmt.free();
      return sections;
    } catch (error) {
      console.error('خطأ في جلب الأقسام:', error);
      return [];
    }
  }

  async getSectionByName(name: string): Promise<Section | null> {
    const stmt = this.db.prepare('SELECT * FROM sections WHERE name = ?');
    try {
      stmt.bind([name]);
      
      if (stmt.step()) {
        return stmt.getAsObject() as Section;
      }
      
      return null;
    } finally {
      stmt.free();
    }
  }

  // الحصول على الأقسام لمستوى معين
  async getSectionsByLevel(levelId: string): Promise<{ id: string; name: string; levelId: string }[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM sections WHERE levelId = ? ORDER BY name');
      const sections = stmt.all(levelId);
      stmt.free();
      return sections as any[];
    } catch (error) {
      console.error('خطأ في جلب أقسام المستوى:', error);
      return [];
    }
  }

  // إدارة السنوات الدراسية
  async addAcademicYear(year: Omit<AcademicYear, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(
      'INSERT INTO academic_years (id, year, startDate, endDate, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, year.year, year.startDate || '', year.endDate || '', year.isActive ? 1 : 0, createdAt]
    );
    
    await this.saveDatabase();
    return id;
  }

  async getAcademicYears(): Promise<AcademicYear[]> {
    if (!this.db) {
      throw new Error('قاعدة البيانات غير متاحة - يرجى انتظار التهيئة');
    }
    
    const stmt = this.db.prepare('SELECT * FROM academic_years ORDER BY year DESC');
    try {
      const years: AcademicYear[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        years.push({
          ...row,
          isActive: Boolean(row.isActive)
        });
      }
      
      return years;
    } finally {
      stmt.free();
    }
  }

  async getAcademicYearByYear(year: string): Promise<AcademicYear | null> {
    const stmt = this.db.prepare('SELECT * FROM academic_years WHERE year = ?');
    try {
      stmt.bind([year]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        return {
          ...row,
          isActive: Boolean(row.isActive)
        };
      }
      
      return null;
    } finally {
      stmt.free();
    }
  }

  // إدارة الإعدادات العامة للنظام
  async getCurrentAcademicYear(): Promise<string> {
    try {
      // محاولة الحصول على السنة النشطة من جدول academic_years
      const stmt = this.db.prepare('SELECT year FROM academic_years WHERE isActive = 1 LIMIT 1');
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result.year as string;
      }
      stmt.free();
      
      // إذا لم توجد سنة نشطة، البحث عن أحدث سنة
      const latestStmt = this.db.prepare('SELECT year FROM academic_years ORDER BY year DESC LIMIT 1');
      if (latestStmt.step()) {
        const result = latestStmt.getAsObject();
        latestStmt.free();
        return result.year as string;
      }
      latestStmt.free();
      
      // إذا لم توجد سنة نشطة، إرجاع السنة الافتراضية
      return '2025/2026';
    } catch (error) {
      console.warn('خطأ في الحصول على السنة الدراسية الحالية:', error);
      return '2025/2026';
    }
  }

  async setCurrentAcademicYear(year: string): Promise<void> {
    try {
      // إلغاء تفعيل جميع السنوات
      this.db.run('UPDATE academic_years SET isActive = 0');
      
      // تفعيل السنة المحددة أو إنشاؤها إذا لم تكن موجودة
      const existingYear = await this.getAcademicYearByYear(year);
      if (existingYear) {
        this.db.run('UPDATE academic_years SET isActive = 1 WHERE year = ?', [year]);
      } else {
        await this.addAcademicYear({
          year,
          startDate: '',
          endDate: '',
          isActive: true
        });
      }
      
      await this.saveDatabase();
    } catch (error) {
      console.error('خطأ في تعيين السنة الدراسية الحالية:', error);
      throw error;
    }
  }

  // إدارة النقل والتحويلات
  async addTransfer(transfer: {
    student_id: string;
    transfer_type: 'وافد' | 'مغادر';
    from_school: string;
    to_school: string;
    transfer_date: string;
    to_province?: string;
    to_academy?: string;
    metadata?: any;
  }): Promise<string> {
    // التحقق من وجود نقل سابق لنفس التلميذ في نفس السنة
    const existingTransfers = await this.getTransfers();
    const duplicateTransfer = existingTransfers.find(t => 
      t.student_id === transfer.student_id && 
      t.transfer_type === transfer.transfer_type &&
      t.metadata && 
      JSON.parse(t.metadata).academicYear === transfer.metadata?.academicYear
    );
    
    if (duplicateTransfer) {
      // تحديث السجل الموجود بدلاً من إضافة جديد
      this.db.run(`
        UPDATE transfers SET 
          from_school = ?, to_school = ?, transfer_date = ?, 
          to_province = ?, to_academy = ?, metadata = ?
        WHERE id = ?
      `, [
        transfer.from_school || '', transfer.to_school || '',
        transfer.transfer_date, transfer.to_province || '', 
        transfer.to_academy || '', JSON.stringify(transfer.metadata || {}),
        duplicateTransfer.id
      ]);
      
      await this.saveDatabase();
      return duplicateTransfer.id;
    }
    
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(`
      INSERT INTO transfers (
        id, student_id, transfer_type, from_school, to_school, 
        transfer_date, to_province, to_academy, metadata, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, transfer.student_id, transfer.transfer_type, 
      transfer.from_school || '', transfer.to_school || '',
      transfer.transfer_date, transfer.to_province || '', 
      transfer.to_academy || '', JSON.stringify(transfer.metadata || {}), createdAt
    ]);
    
    await this.saveDatabase();
    return id;
  }

  async getTransfers(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM transfers ORDER BY transfer_date DESC');
    try {
      const transfers: any[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        transfers.push({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        });
      }
      
      return transfers;
    } finally {
      stmt.free();
    }
  }

  // إدارة المنقطعين
  async addDropout(dropout: {
    student_id: string;
    dropout_date: string;
    reason?: string;
    metadata?: any;
  }): Promise<string> {
    // التحقق من وجود سجل انقطاع سابق
    const existingDropouts = await this.getDropouts();
    const duplicateDropout = existingDropouts.find(d => 
      d.student_id === dropout.student_id &&
      d.metadata && 
      JSON.parse(d.metadata).academicYear === dropout.metadata?.academicYear
    );
    
    if (duplicateDropout) {
      // تحديث السجل الموجود
      this.db.run(`
        UPDATE dropouts SET 
          dropout_date = ?, reason = ?, metadata = ?
        WHERE id = ?
      `, [
        dropout.dropout_date, dropout.reason || '', 
        JSON.stringify(dropout.metadata || {}), duplicateDropout.id
      ]);
      
      await this.saveDatabase();
      return duplicateDropout.id;
    }
    
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(`
      INSERT INTO dropouts (id, student_id, dropout_date, reason, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id, dropout.student_id, dropout.dropout_date, 
      dropout.reason || '', JSON.stringify(dropout.metadata || {}), createdAt
    ]);
    
    await this.saveDatabase();
    return id;
  }

  async getDropouts(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM dropouts ORDER BY dropout_date DESC');
    try {
      const dropouts: any[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        dropouts.push({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        });
      }
      
      return dropouts;
    } finally {
      stmt.free();
    }
  }

  // إدارة المفصولين
  async addDismissedStudent(dismissed: {
    student_id: string;
    dismissal_date: string;
    reason?: string;
    metadata?: any;
  }): Promise<string> {
    // التحقق من وجود سجل فصل سابق
    const existingDismissed = await this.getDismissedStudents();
    const duplicateDismissed = existingDismissed.find(d => 
      d.student_id === dismissed.student_id &&
      d.metadata && 
      JSON.parse(d.metadata).academicYear === dismissed.metadata?.academicYear
    );
    
    if (duplicateDismissed) {
      // تحديث السجل الموجود
      this.db.run(`
        UPDATE dismissed_students SET 
          dismissal_date = ?, reason = ?, metadata = ?
        WHERE id = ?
      `, [
        dismissed.dismissal_date, dismissed.reason || '', 
        JSON.stringify(dismissed.metadata || {}), duplicateDismissed.id
      ]);
      
      await this.saveDatabase();
      return duplicateDismissed.id;
    }
    
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(`
      INSERT INTO dismissed_students (id, student_id, dismissal_date, reason, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id, dismissed.student_id, dismissed.dismissal_date, 
      dismissed.reason || '', JSON.stringify(dismissed.metadata || {}), createdAt
    ]);
    
    await this.saveDatabase();
    return id;
  }

  async getDismissedStudents(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM dismissed_students ORDER BY dismissal_date DESC');
    try {
      const dismissed: any[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        dismissed.push({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        });
      }
      
      return dismissed;
    } finally {
      stmt.free();
    }
  }

  // إدارة المدمجين
  async addReintegration(reintegration: {
    student_id: string;
    reintegration_date: string;
    previous_status: string;
    metadata?: any;
  }): Promise<string> {
    // التحقق من وجود سجل إدماج سابق
    const existingReintegrations = await this.getReintegrations();
    const duplicateReintegration = existingReintegrations.find(r => 
      r.student_id === reintegration.student_id &&
      r.metadata && 
      JSON.parse(r.metadata).academicYear === reintegration.metadata?.academicYear
    );
    
    if (duplicateReintegration) {
      // تحديث السجل الموجود
      this.db.run(`
        UPDATE reintegration SET 
          reintegration_date = ?, previous_status = ?, metadata = ?
        WHERE id = ?
      `, [
        reintegration.reintegration_date, reintegration.previous_status, 
        JSON.stringify(reintegration.metadata || {}), duplicateReintegration.id
      ]);
      
      await this.saveDatabase();
      return duplicateReintegration.id;
    }
    
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(`
      INSERT INTO reintegration (id, student_id, reintegration_date, previous_status, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id, reintegration.student_id, reintegration.reintegration_date, 
      reintegration.previous_status, JSON.stringify(reintegration.metadata || {}), createdAt
    ]);
    
    await this.saveDatabase();
    return id;
  }

  async getReintegrations(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM reintegration ORDER BY reintegration_date DESC');
    try {
      const reintegrations: any[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        reintegrations.push({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        });
      }
      
      return reintegrations;
    } finally {
      stmt.free();
    }
  }

  // إدارة التلاميذ غير الملتحقين
  async addUnenrolledStudent(student: {
    student_id: string;
    lastName: string;
    firstName: string;
    gender: string;
    dateOfBirth: string;
    birthPlace: string;
    metadata?: any;
  }): Promise<string> {
    // التحقق من وجود سجل عدم التحاق سابق
    const existingUnenrolled = await this.getUnenrolledStudents();
    const duplicateUnenrolled = existingUnenrolled.find(u => 
      u.student_id === student.student_id &&
      u.metadata && 
      JSON.parse(u.metadata).academicYear === student.metadata?.academicYear
    );
    
    if (duplicateUnenrolled) {
      // تحديث السجل الموجود
      this.db.run(`
        UPDATE unenrolled_students SET 
          lastName = ?, firstName = ?, gender = ?, 
          dateOfBirth = ?, birthPlace = ?, metadata = ?
        WHERE id = ?
      `, [
        student.lastName, student.firstName, student.gender,
        student.dateOfBirth, student.birthPlace,
        JSON.stringify(student.metadata || {}), duplicateUnenrolled.id
      ]);
      
      await this.saveDatabase();
      return duplicateUnenrolled.id;
    }
    
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(`
      INSERT INTO unenrolled_students (
        id, student_id, lastName, firstName, gender, 
        dateOfBirth, birthPlace, metadata, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, student.student_id, student.lastName, student.firstName,
      student.gender, student.dateOfBirth, student.birthPlace,
      JSON.stringify(student.metadata || {}), createdAt
    ]);
    
    await this.saveDatabase();
    return id;
  }

  async getUnenrolledStudents(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM unenrolled_students ORDER BY createdAt DESC');
    try {
      const students: any[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        students.push({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        });
      }
      
      return students;
    } finally {
      stmt.free();
    }
  }
  // مقارنة لوائح الموسم الماضي مع الحالي
  async compareAcademicYears(currentYear: string, previousYear: string): Promise<{
    newStudents: any[];
    leftStudents: any[];
    continuingStudents: any[];
    stats: {
      continuityRate: number;
      growthRate: number;
      totalCurrent: number;
      totalPrevious: number;
    };
  }> {
    try {
      if (!this.db) {
        throw new Error('قاعدة البيانات غير متاحة - يرجى انتظار التهيئة');
      }
      
      // الحصول على تلاميذ السنة الحالية (المتمدرسين)
      const currentStudentsStmt = this.db.prepare('SELECT * FROM students WHERE academicYear = ? AND status = ?');
      currentStudentsStmt.bind([currentYear, 'متمدرس']);
      const currentStudents: any[] = [];
      while (currentStudentsStmt.step()) {
        currentStudents.push(currentStudentsStmt.getAsObject());
      }
      currentStudentsStmt.free();

      // الحصول على تلاميذ السنة الماضية (المتمدرسين)
      const previousStudentsStmt = this.db.prepare('SELECT * FROM students WHERE academicYear = ? AND status = ?');
      previousStudentsStmt.bind([previousYear, 'متمدرس']);
      const previousStudents: any[] = [];
      while (previousStudentsStmt.step()) {
        previousStudents.push(previousStudentsStmt.getAsObject());
      }
      previousStudentsStmt.free();

      console.log(`📊 مقارنة الموسمين:`, {
        currentYear,
        previousYear,
        currentCount: currentStudents.length,
        previousCount: previousStudents.length
      });
      // إنشاء خرائط للمقارنة السريعة
      const currentMap = new Map(currentStudents.map(s => [s.nationalId, s]));
      const previousMap = new Map(previousStudents.map(s => [s.nationalId, s]));

      // التلاميذ الجدد (موجودين في الحالي وغير موجودين في الماضي)
      const newStudents = currentStudents.filter(s => !previousMap.has(s.nationalId));

      // التلاميذ المغادرين (موجودين في الماضي وغير موجودين في الحالي)
      const leftStudents = previousStudents.filter(s => !currentMap.has(s.nationalId));

      // التلاميذ المستمرين (موجودين في كلا الموسمين)
      const continuingStudents = currentStudents.filter(s => previousMap.has(s.nationalId));

      // حساب الإحصائيات
      const continuityRate = previousStudents.length > 0 ? 
        Math.round((continuingStudents.length / previousStudents.length) * 100) : 0;
      
      const growthRate = previousStudents.length > 0 ? 
        Math.round(((currentStudents.length - previousStudents.length) / previousStudents.length) * 100) : 0;

      console.log(`📈 نتائج المقارنة:`, {
        newStudents: newStudents.length,
        leftStudents: leftStudents.length,
        continuingStudents: continuingStudents.length,
        continuityRate,
        growthRate
      });
      return {
        newStudents,
        leftStudents,
        continuingStudents,
        stats: {
          continuityRate,
          growthRate,
          totalCurrent: currentStudents.length,
          totalPrevious: previousStudents.length
        }
      };
    } catch (error) {
      console.error('خطأ في مقارنة السنوات الدراسية:', error);
      throw error;
    }
  }

  // إدارة الأكواد السرية
  async getCredentials(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM credentials ORDER BY issue_date DESC');
    try {
      const credentials: any[] = [];
      
      while (stmt.step()) {
        credentials.push(stmt.getAsObject());
      }
      
      return credentials;
    } finally {
      stmt.free();
    }
  }

  async getCredentialByStudentId(studentId: string): Promise<any | null> {
    const stmt = this.db.prepare('SELECT * FROM credentials WHERE student_id = ?');
    try {
      stmt.bind([studentId]);
      
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      
      return null;
    } finally {
      stmt.free();
    }
  }

  async addOrUpdateCredential(credential: any): Promise<void> {
    this.db.run(
      'INSERT OR REPLACE INTO credentials (student_id, secret_code, issue_date) VALUES (?, ?, ?)',
      [credential.student_id, credential.secret_code, credential.issue_date]
    );
    
    await this.saveDatabase();
  }

  async deleteCredential(studentId: string): Promise<void> {
    this.db.run('DELETE FROM credentials WHERE student_id = ?', [studentId]);
    await this.saveDatabase();
  }

  // إدارة قرارات المجالس
  async getCouncilDecisions(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM council_decisions ORDER BY decision_date DESC');
    try {
      const decisions: any[] = [];
      
      while (stmt.step()) {
        decisions.push(stmt.getAsObject());
      }
      
      return decisions;
    } finally {
      stmt.free();
    }
  }

  // إدارة إحصائيات التوجيه
  async initGuidanceDatabase(): Promise<void> {
    // حذف الجدول الموجود وإعادة إنشاؤه
    try {
      this.db.run('DROP TABLE IF EXISTS guidance_statistics');
    } catch (error) {
      console.warn('لا يمكن حذف جدول guidance_statistics:', error);
    }
    
    // إنشاء الجدول من جديد
    this.db.run(`
      CREATE TABLE guidance_statistics (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        student_id TEXT NOT NULL,
        assigned_stream TEXT,
        gender TEXT,
        decision TEXT,
        academic_year TEXT,
        level TEXT,
        section TEXT,
        age INTEGER,
        ageGroup TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT,
        FOREIGN KEY (levelId) REFERENCES levels(id),
        FOREIGN KEY (sectionId) REFERENCES sections(id)
      )
    `);
   
// جدول المستويات
this.db.exec(`
  CREATE TABLE IF NOT EXISTS levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// جدول الأقسام
this.db.exec(`
  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    levelId TEXT NOT NULL,
    code TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (levelId) REFERENCES levels(id)
  )
`);
    
    await this.saveDatabase();
  }

  async getGuidanceStatistics(): Promise<any> {
    try {
      const stmt = this.db.prepare('SELECT * FROM guidance_statistics ORDER BY createdAt DESC');
      const records: any[] = [];
      
      while (stmt.step()) {
        records.push(stmt.getAsObject());
      }
      stmt.free();
      
      return {
        totalStudents: records.length,
        records: records
      };
    } catch (error) {
      console.warn('خطأ في جلب إحصائيات التوجيه:', error);
      return {
        totalStudents: 0,
        records: []
      };
    }
  }

  async addGuidanceStatistic(statistic: any): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    
    this.db.run(`
      INSERT INTO guidance_statistics (
        id, student_id, assigned_stream, gender, decision, 
        academic_year, level, section, age, ageGroup, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, statistic.student_id, statistic.assigned_stream || '', 
      statistic.gender || '', statistic.decision || '', 
      statistic.academic_year || '', statistic.level || '', 
      statistic.section || '', statistic.age || null, 
      statistic.ageGroup || '', createdAt
    ]);
    
    await this.saveDatabase();
    return id;
  }

  async clearGuidanceStatistics(): Promise<void> {
    this.db.run('DELETE FROM guidance_statistics');
    await this.saveDatabase();
  }

  async resetGuidanceStatistics(): Promise<void> {
    await this.initGuidanceDatabase();
  }

  // تصدير واستيراد قاعدة البيانات
  async exportData(): Promise<Uint8Array> {
    if (!this.db) {
      throw new Error('قاعدة البيانات غير متاحة');
    }
    return this.db.export();
  }

  async importData(data: Uint8Array): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
    
    if (this.db) {
      this.db.close();
    }
    
    this.db = new SQL.Database(data);
    await this.saveDatabase();
  }

  // الحصول على إعدادات المؤسسة
  async getInstitutionSettings(): Promise<any> {
    try {
      if (!this.db) {
        throw new Error('قاعدة البيانات غير مهيأة');
      }

      const stmt = this.db.prepare('SELECT * FROM institution_settings ORDER BY updatedAt DESC LIMIT 1');
      const result = stmt.getAsObject();
      stmt.free();

      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      console.warn('خطأ في جلب إعدادات المؤسسة:', error);
      return null;
    }
  }

  // باقي الدوال الموجودة...
  /**
   * إضافة تلميذ جديد
   * يستخدم في: StudentManagement, SchoolEnrollmentImport
   */
  async addStudent(student: any): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // البحث عن المستوى والقسم بالاسم وربطهما
    let levelId = null;
    let sectionId = null;

    if (student.level) {
      const level = await this.getLevelByName(student.level);
      levelId = level?.id || null;
    }

    if (student.section && levelId) {
      const section = await this.getSectionByName(student.section);
      sectionId = section?.id || null;
    }

    this.db.run(`
      INSERT INTO students (
        id, firstName, lastName, nationalId, gender, birthPlace, dateOfBirth,
        email, phone, studentId, grade, section, level, levelId, sectionId,
        enrollmentDate, address, emergencyContact, emergencyPhone,
        guardianName, guardianPhone, guardianRelation, socialSupport,
        transportService, medicalInfo, notes, status, ageGroup, schoolType,
        academicYear, region, province, municipality, institution,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, student.firstName, student.lastName, student.nationalId,
      student.gender, student.birthPlace || '', student.dateOfBirth || '',
      student.email || '', student.phone || '', student.studentId || student.nationalId,
      student.grade || '', student.section || '', student.level || '',
      levelId, sectionId, student.enrollmentDate,
      student.address || '', student.emergencyContact || '', student.emergencyPhone || '',
      student.guardianName || '', student.guardianPhone || '', student.guardianRelation || '',
      student.socialSupport ? 1 : 0, student.transportService ? 1 : 0,
      student.medicalInfo || '', student.notes || '', student.status || 'نشط',
      student.ageGroup || '', student.schoolType || '', student.academicYear || '2025/2026',
      student.region || '', student.province || '', student.municipality || '',
      student.institution || '', createdAt, updatedAt
    ]);

    await this.saveDatabase();
    return id;
  }

  /**
   * الحصول على جميع التلاميذ
   * يستخدم في: StudentManagement, Dashboard, Reports
   */
  async getStudents(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT s.*, l.name as levelName, sec.name as sectionName 
      FROM students s 
      LEFT JOIN levels l ON s.levelId = l.id 
      LEFT JOIN sections sec ON s.sectionId = sec.id 
      ORDER BY s.lastName, s.firstName
    `);
    try {
      const students: any[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        students.push({
          ...row,
          socialSupport: Boolean(row.socialSupport),
          transportService: Boolean(row.transportService)
        });
      }

      return students;
    } finally {
      stmt.free();
    }
  }

  /**
   * الحصول على تلميذ بواسطة المعرف
   * يستخدم في: StudentDetail, StudentForm
   */
  async getStudentById(id: string): Promise<any | null> {
    const stmt = this.db.prepare(`
      SELECT s.*, l.name as levelName, sec.name as sectionName 
      FROM students s 
      LEFT JOIN levels l ON s.levelId = l.id 
      LEFT JOIN sections sec ON s.sectionId = sec.id 
      WHERE s.id = ?
    `);
    try {
      stmt.bind([id]);

      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        return {
          ...row,
          socialSupport: Boolean(row.socialSupport),
          transportService: Boolean(row.transportService)
        };
      }

      return null;
    } finally {
      stmt.free();
    }

  }

  /**
   * الحصول على تلميذ بواسطة الرقم الوطني
   * يستخدم في: SchoolEnrollmentImport, CouncilDecisionsImport
   */
  async getStudentByNationalId(nationalId: string): Promise<any | null> {
    const stmt = this.db.prepare(`
      SELECT s.*, l.name as levelName, sec.name as sectionName 
      FROM students s 
      LEFT JOIN levels l ON s.levelId = l.id 
      LEFT JOIN sections sec ON s.sectionId = sec.id 
      WHERE s.nationalId = ? LIMIT 1
    `);
    try {
      stmt.bind([nationalId]);

      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        return {
          ...row,
          socialSupport: Boolean(row.socialSupport),
          transportService: Boolean(row.transportService)
        };
      }

      return null;
    } finally {
      stmt.free();
    }

  }

  // التحقق من وجود تلميذ في موسم دراسي محدد
  async getStudentByNationalIdAndYear(nationalId: string, academicYear: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('قاعدة البيانات غير متاحة - يرجى انتظار التهيئة');
    }
    
    const stmt = this.db.prepare(`
      SELECT s.*, l.name as levelName, sec.name as sectionName 
      FROM students s 
      LEFT JOIN levels l ON s.levelId = l.id 
      LEFT JOIN sections sec ON s.sectionId = sec.id 
      WHERE s.nationalId = ? AND s.academicYear = ? LIMIT 1
    `);
    try {
      stmt.bind([nationalId, academicYear]);

      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        return {
          ...row,
          socialSupport: Boolean(row.socialSupport),
          transportService: Boolean(row.transportService)
        };
      }

      return null;
    } finally {
      stmt.free();
    }
  }

  // الحصول على التلاميذ حسب السنة الدراسية
  async getStudentsByAcademicYear(academicYear: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT s.*, l.name as levelName, sec.name as sectionName 
      FROM students s 
      LEFT JOIN levels l ON s.levelId = l.id 
      LEFT JOIN sections sec ON s.sectionId = sec.id 
      WHERE s.academicYear = ?
      ORDER BY s.lastName, s.firstName
    `);
    try {
      stmt.bind([academicYear]);
      const students: any[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        students.push({
          ...row,
          socialSupport: Boolean(row.socialSupport),
          transportService: Boolean(row.transportService)
        });
      }

      return students;
    } finally {
      stmt.free();
    }
  }

  /**
   * الحصول على تلميذ بواسطة رقم التلميذ
   * يستخدم في: CredentialsImport
   */
  async getStudentByStudentId(studentId: string): Promise<any | null> {
    const stmt = this.db.prepare(`
      SELECT s.*, l.name as levelName, sec.name as sectionName 
      FROM students s 
      LEFT JOIN levels l ON s.levelId = l.id 
      LEFT JOIN sections sec ON s.sectionId = sec.id 
      WHERE s.studentId = ?
    `);
    try {
      stmt.bind([studentId]);

      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        return {
          ...row,
          socialSupport: Boolean(row.socialSupport),
          transportService: Boolean(row.transportService)
        };
      }

      return null;
    } finally {
      stmt.free();
    }

  }

  /**
   * تحديث بيانات تلميذ
   * يستخدم في: StudentManagement, SchoolEnrollmentImport
   */
  async updateStudent(id: string, updates: any): Promise<void> {
    const updatedAt = new Date().toISOString();
    
    // البحث عن المستوى والقسم بالاسم وربطهما إذا تم تحديثهما
    let levelId = updates.levelId;
    let sectionId = updates.sectionId;

    if (updates.level && !levelId) {
      const level = await this.getLevelByName(updates.level);
      levelId = level?.id || null;
    }

    if (updates.section && !sectionId && levelId) {
      const section = await this.getSectionByName(updates.section);
      sectionId = section?.id || null;
    }

    const fields = Object.keys(updates).filter(key => key !== 'id').map(key => `${key} = ?`);
    const values = Object.keys(updates).filter(key => key !== 'id').map(key => {
      if (key === 'socialSupport' || key === 'transportService') {
        return updates[key] ? 1 : 0;
      }
      return updates[key];
    });

    if (levelId !== undefined) {
      fields.push('levelId = ?');
      values.push(levelId);
    }

    if (sectionId !== undefined) {
      fields.push('sectionId = ?');
      values.push(sectionId);
    }

    fields.push('updatedAt = ?');
    values.push(updatedAt);

    this.db.run(
      `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    await this.saveDatabase();
  }

  /**
   * حذف تلميذ (مع جميع البيانات المرتبطة)
   * يستخدم في: StudentManagement
   */
  async deleteStudent(id: string): Promise<void> {
    this.db.run('DELETE FROM students WHERE id = ?', [id]);
    await this.saveDatabase();
  }

  // باقي الدوال للحضور والنقط...
  async addAttendanceRecord(record: any): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    this.db.run(`
      INSERT INTO attendance_records (id, studentId, date, status, period, subject, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.studentId, record.date, record.status,
      record.period || '', record.subject || '', record.notes || '', createdAt
    ]);

    await this.saveDatabase();
    return id;
  }

  async getAttendanceRecords(studentId?: string): Promise<any[]> {
    let query = 'SELECT * FROM attendance_records';
    let params: any[] = [];

    if (studentId) {
      query += ' WHERE studentId = ?';
      params.push(studentId);
    }

    query += ' ORDER BY date DESC, createdAt DESC';

    const stmt = this.db.prepare(query);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }

      const records: any[] = [];
      while (stmt.step()) {
        records.push(stmt.getAsObject());
      }

      return records;
    } finally {
      stmt.free();
    }

  }

  async updateAttendanceRecord(id: string, updates: any): Promise<void> {
    const fields = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);

    this.db.run(
      `UPDATE attendance_records SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    await this.saveDatabase();
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    this.db.run('DELETE FROM attendance_records WHERE id = ?', [id]);
    await this.saveDatabase();
  }

  async addGradeRecord(record: any): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    this.db.run(`
      INSERT INTO grade_records (
        id, studentId, subject, grade, maxGrade, assignmentType,
        semester, academicYear, date, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.studentId, record.subject, record.grade, record.maxGrade,
      record.assignmentType, record.semester || '', record.academicYear || '',
      record.date, record.notes || '', createdAt
    ]);

    await this.saveDatabase();
    return id;
  }

  async getGradeRecords(studentId?: string): Promise<any[]> {
    let query = 'SELECT * FROM grade_records';
    let params: any[] = [];

    if (studentId) {
      query += ' WHERE studentId = ?';
      params.push(studentId);
    }

    query += ' ORDER BY date DESC, createdAt DESC';

    const stmt = this.db.prepare(query);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }

      const records: any[] = [];
      while (stmt.step()) {
        records.push(stmt.getAsObject());
      }

      return records;
    } finally {
      stmt.free();
    }
  }

  /**
   * مسح قاعدة البيانات بالكامل
   * يستخدم في: Settings
   */
  async clearDatabase(): Promise<void> {
    try {
      // إغلاق قاعدة البيانات الحالية
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // حذف البيانات من IndexedDB
      const db = await this.openIndexedDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });

      // إعادة تعيين حالة التهيئة
      this.isInitialized = false;

      // إعادة تهيئة قاعدة البيانات بجداول فارغة
      await this.initialize();

      console.log('تم مسح قاعدة البيانات بنجاح');
    } catch (error) {
      console.error('خطأ في مسح قاعدة البيانات:', error);
      throw error;
    }
  }

  private async saveDatabase(): Promise<void> {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      await this.saveToIndexedDB(data);
    } catch (error) {
      console.error('خطأ في حفظ قاعدة البيانات:', error);
    }
  }

  /**
   * الحصول على إحصائيات قاعدة البيانات للوحة التحكم
   * يستخدم في: Dashboard
   */
  async getDatabaseStats(academicYear?: string): Promise<any> {
    try {
      // تحديد السنة الدراسية الحالية
      const currentYear = academicYear || '2025/2026';
      
      const stats = {
        totalStudents: 0,
        activeStudents: 0,
        maleStudents: 0,
        femaleStudents: 0,
        totalAttendanceRecords: 0,
        totalGradeRecords: 0,
        averageGrade: 0,
        attendanceRate: 0,
        socialSupportCount: 0,
        transportServiceCount: 0
      };

    // التأكد من تهيئة قاعدة البيانات
    if (!this.db) {
      console.warn('قاعدة البيانات غير مهيأة، جاري إعادة التهيئة...');
      await this.initialize();
    }
    
    if (!this.db) {
      throw new Error('فشل في تهيئة قاعدة البيانات');
    }

      // إحصائيات التلاميذ - المتمدرسين + الوافدين + المدمجين في السنة الحالية
      const totalStudentsStmt = this.db.prepare('SELECT COUNT(*) as count FROM students WHERE academicYear = ? AND status = ?');
      totalStudentsStmt.bind([currentYear, 'متمدرس']);
      if (totalStudentsStmt.step()) {
        stats.totalStudents = totalStudentsStmt.getAsObject().count as number;
      }
      totalStudentsStmt.free();

      // التلاميذ النشطون - نفس العدد لأننا نحسب المتمدرسين (شامل الوافدين والمدمجين)
      const activeStudentsStmt = this.db.prepare("SELECT COUNT(*) as count FROM students WHERE academicYear = ? AND status = ?");
      activeStudentsStmt.bind([currentYear, 'متمدرس']);
      if (activeStudentsStmt.step()) {
        stats.activeStudents = activeStudentsStmt.getAsObject().count as number;
      }
      activeStudentsStmt.free();

      // التلاميذ الذكور - فقط المتمدرسين في السنة الحالية
      const maleStudentsStmt = this.db.prepare("SELECT COUNT(*) as count FROM students WHERE gender = ? AND academicYear = ? AND status = ?");
      maleStudentsStmt.bind(['ذكر', currentYear, 'متمدرس']);
      if (maleStudentsStmt.step()) {
        stats.maleStudents = maleStudentsStmt.getAsObject().count as number;
      }
      maleStudentsStmt.free();

      // التلميذات الإناث - فقط المتمدرسات في السنة الحالية
      const femaleStudentsStmt = this.db.prepare("SELECT COUNT(*) as count FROM students WHERE gender = ? AND academicYear = ? AND status = ?");
      femaleStudentsStmt.bind(['أنثى', currentYear, 'متمدرس']);
      if (femaleStudentsStmt.step()) {
        stats.femaleStudents = femaleStudentsStmt.getAsObject().count as number;
      }
      femaleStudentsStmt.free();

      // المستفيدون من الدعم الاجتماعي - فقط المتمدرسين في السنة الحالية
      const socialSupportStmt = this.db.prepare('SELECT COUNT(*) as count FROM students WHERE socialSupport = 1 AND academicYear = ? AND status = ?');
      socialSupportStmt.bind([currentYear, 'متمدرس']);
      if (socialSupportStmt.step()) {
        stats.socialSupportCount = socialSupportStmt.getAsObject().count as number;
      }
      socialSupportStmt.free();

      // المستفيدون من خدمة النقل - فقط المتمدرسين في السنة الحالية
      const transportServiceStmt = this.db.prepare('SELECT COUNT(*) as count FROM students WHERE transportService = 1 AND academicYear = ? AND status = ?');
      transportServiceStmt.bind([currentYear, 'متمدرس']);
      if (transportServiceStmt.step()) {
        stats.transportServiceCount = transportServiceStmt.getAsObject().count as number;
      }
      transportServiceStmt.free();

      // إحصائيات الحضور
      const attendanceStmt = this.db.prepare('SELECT COUNT(*) as count FROM attendance_records');
      if (attendanceStmt.step()) {
        stats.totalAttendanceRecords = attendanceStmt.getAsObject().count as number;
      }
      attendanceStmt.free();

      // إحصائيات النقط
      const gradesStmt = this.db.prepare('SELECT COUNT(*) as count FROM grade_records');
      if (gradesStmt.step()) {
        stats.totalGradeRecords = gradesStmt.getAsObject().count as number;
      }
      gradesStmt.free();

      // متوسط النقط
      const avgGradeStmt = this.db.prepare('SELECT AVG(grade) as avg FROM grade_records');
      if (avgGradeStmt.step()) {
        const avgResult = avgGradeStmt.getAsObject().avg;
        stats.averageGrade = avgResult ? Math.round(avgResult as number * 100) / 100 : 0;
      }
      avgGradeStmt.free();

      // معدل الحضور
      const attendanceRateStmt = this.db.prepare("SELECT COUNT(*) as present FROM attendance_records WHERE status = 'حاضر'");
      if (attendanceRateStmt.step()) {
        const presentCount = attendanceRateStmt.getAsObject().present as number;
        stats.attendanceRate = stats.totalAttendanceRecords > 0 
          ? Math.round((presentCount / stats.totalAttendanceRecords) * 100) 
          : 0;
      }
      attendanceRateStmt.free();

      return stats;
    } catch (error) {
      console.error('خطأ في حساب إحصائيات قاعدة البيانات:', error);
      // إرجاع إحصائيات فارغة في حالة الخطأ
      return {
        totalStudents: 0,
        activeStudents: 0,
        maleStudents: 0,
        femaleStudents: 0,
        totalAttendanceRecords: 0,
        totalGradeRecords: 0,
        averageGrade: 0,
        attendanceRate: 0,
        socialSupportCount: 0,
        transportServiceCount: 0
      };
    }
  }
 
}

// إنشاء وتصدير مثيل من مدير قاعدة البيانات
export const dbManager = new DatabaseManager();