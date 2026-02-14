export type Language = 'th' | 'en';

const translations = {
  th: {
    // App
    appName: 'NurseMind AI',
    appSubtitle: 'ระบบประเมินสมรรถนะพยาบาลด้วย AI',
    hospital: 'โรงพยาบาลศูนย์การแพทย์มหาวิทยาลัยแม่ฟ้าหลวง',

    // Auth
    login: 'เข้าสู่ระบบ',
    logout: 'ออกจากระบบ',
    email: 'อีเมล',
    password: 'รหัสผ่าน',
    loginFailed: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',

    // Navigation
    dashboard: 'แดชบอร์ด',
    assessments: 'การประเมิน',
    cases: 'กรณีศึกษา',
    rubrics: 'เกณฑ์ประเมิน',
    users: 'จัดการผู้ใช้',
    departments: 'แผนก',
    reviews: 'ตรวจสอบผล',
    analytics: 'วิเคราะห์ข้อมูล',
    reports: 'รายงาน',
    myAssessments: 'การประเมินของฉัน',
    history: 'ประวัติ',

    // Roles
    admin: 'ผู้ดูแลระบบ',
    nurse: 'พยาบาล',
    reviewer: 'หัวหน้างาน',

    // Assessment
    startAssessment: 'เริ่มการประเมิน',
    selfAssessment: 'ประเมินตนเอง',
    submitResponse: 'ส่งคำตอบ',
    caseScenario: 'กรณีศึกษา',
    yourResponse: 'คำตอบของคุณ',
    textInput: 'พิมพ์คำตอบ',
    voiceInput: 'บันทึกเสียง',
    recording: 'กำลังบันทึก...',
    stopRecording: 'หยุดบันทึก',
    aiEvaluating: 'AI กำลังประเมิน...',
    selectCase: 'เลือกกรณีศึกษา',

    // Scores
    score: 'คะแนน',
    selfScore: 'ตนเอง',
    aiScore: 'คะแนน AI',
    reviewerScore: 'หัวหน้า',
    finalScore: 'คะแนนที่ได้',
    standardLevel: 'ระดับมาตรฐาน',
    gap: 'ส่วนต่าง',
    strengths: 'จุดแข็ง',
    weaknesses: 'จุดที่ต้องพัฒนา',
    recommendations: 'ข้อเสนอแนะ',
    confidence: 'ความมั่นใจ AI',

    // Status
    inProgress: 'กำลังดำเนินการ',
    selfAssessed: 'ประเมินตนเองแล้ว',
    aiScored: 'AI ประเมินแล้ว',
    aiFailed: 'AI ประเมินไม่สำเร็จ',
    reviewed: 'ตรวจสอบแล้ว',
    approved: 'อนุมัติแล้ว',

    // Reviewer
    pendingReviews: 'รอการตรวจสอบ',
    reviewAssessment: 'ตรวจสอบผลประเมิน',
    approve: 'อนุมัติ',
    editScore: 'แก้ไขคะแนน',
    feedback: 'ข้อเสนอแนะจากหัวหน้า',
    versionHistory: 'ประวัติการแก้ไข',

    // IDP
    idp: 'แผนพัฒนารายบุคคล (IDP)',
    summaryResults: 'สรุปผลการประเมิน',

    // Voice Chat
    voiceChat: 'สนทนาด้วยเสียง',
    voiceChatTitle: 'AI Avatar — สนทนาประเมินสมรรถนะ',
    startVoiceChat: 'เริ่มสนทนากับ AI Avatar',
    voiceModeLabel: 'สนทนาด้วยเสียง (Voice Chat)',
    textModeLabel: 'พิมพ์คำตอบ (Text)',
    pressToSpeak: 'กดเพื่อพูด',
    stopAndSend: 'หยุดพูด & ส่งคำตอบ',
    skipSpeech: 'ข้ามเสียงพูด',
    conversationComplete: 'สนทนาเสร็จสิ้น',
    processingScores: 'กำลังประมวลผลคะแนนจากบทสนทนา...',

    // Experience Levels
    level1: '0-1 ปี (มือใหม่)',
    level2: '1-2 ปี (เริ่มต้น)',
    level3: '2-3 ปี (มีความสามารถ)',
    level4: 'มากกว่า 3 ปี (หัวหน้า)',
    level5: 'มากกว่า 5 ปี (เชี่ยวชาญ)',

    // Competency Types
    coreCompetency: 'สมรรถนะหลัก',
    functionalCompetency: 'สมรรถนะตามบทบาทหน้าที่',
    specificCompetency: 'ประเด็นสำคัญทางคลินิก',
    managerialCompetency: 'สมรรถนะด้านการบริหาร',

    // Analytics
    averageByCategory: 'คะแนนเฉลี่ยตามกลุ่มสมรรถนะ',
    topWeaknesses: 'จุดที่ต้องพัฒนามากที่สุด',
    scoreTrend: 'แนวโน้มคะแนนตามช่วงเวลา',
    departmentComparison: 'เปรียบเทียบระหว่างแผนก',
    totalAssessments: 'การประเมินทั้งหมด',
    completedAssessments: 'ประเมินเสร็จสิ้น',
    approvedAssessments: 'อนุมัติแล้ว',
    totalNurses: 'จำนวนพยาบาล',

    // Actions
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    edit: 'แก้ไข',
    delete: 'ลบ',
    create: 'สร้าง',
    search: 'ค้นหา',
    filter: 'กรอง',
    download: 'ดาวน์โหลด',
    viewDetails: 'ดูรายละเอียด',
    back: 'กลับ',
    confirm: 'ยืนยัน',
    loading: 'กำลังโหลด...',
    noData: 'ไม่มีข้อมูล',

    // Report
    downloadPDF: 'ดาวน์โหลด PDF',
    assessmentReport: 'รายงานผลประเมินสมรรถนะ',
    evaluationResults: 'ผลการประเมิน',
    assessmentDate: 'วันที่ประเมิน',
    department: 'แผนก',
    position: 'ตำแหน่ง',
    experienceLevel: 'ระดับประสบการณ์',
  },
  en: {
    // App
    appName: 'NurseMind AI',
    appSubtitle: 'AI-Powered Nurse Competency Assessment',
    hospital: 'Mae Fah Luang University Medical Center Hospital',

    // Auth
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    loginFailed: 'Invalid email or password',

    // Navigation
    dashboard: 'Dashboard',
    assessments: 'Assessments',
    cases: 'Case Studies',
    rubrics: 'Rubrics',
    users: 'User Management',
    departments: 'Departments',
    reviews: 'Reviews',
    analytics: 'Analytics',
    reports: 'Reports',
    myAssessments: 'My Assessments',
    history: 'History',

    // Roles
    admin: 'Administrator',
    nurse: 'Nurse',
    reviewer: 'Supervisor',

    // Assessment
    startAssessment: 'Start Assessment',
    selfAssessment: 'Self Assessment',
    submitResponse: 'Submit Response',
    caseScenario: 'Case Scenario',
    yourResponse: 'Your Response',
    textInput: 'Text Input',
    voiceInput: 'Voice Input',
    recording: 'Recording...',
    stopRecording: 'Stop Recording',
    aiEvaluating: 'AI Evaluating...',
    selectCase: 'Select Case',

    // Scores
    score: 'Score',
    selfScore: 'Self',
    aiScore: 'AI Score',
    reviewerScore: 'Supervisor',
    finalScore: 'Score',
    standardLevel: 'Standard Level',
    gap: 'GAP',
    strengths: 'Strengths',
    weaknesses: 'Areas for Improvement',
    recommendations: 'Recommendations',
    confidence: 'AI Confidence',

    // Status
    inProgress: 'In Progress',
    selfAssessed: 'Self Assessed',
    aiScored: 'AI Scored',
    aiFailed: 'AI Failed',
    reviewed: 'Reviewed',
    approved: 'Approved',

    // Reviewer
    pendingReviews: 'Pending Reviews',
    reviewAssessment: 'Review Assessment',
    approve: 'Approve',
    editScore: 'Edit Score',
    feedback: 'Supervisor Feedback',
    versionHistory: 'Version History',

    // IDP
    idp: 'Individual Development Plan (IDP)',
    summaryResults: 'Summary of Results',

    // Voice Chat
    voiceChat: 'Voice Chat',
    voiceChatTitle: 'AI Avatar — Competency Assessment Conversation',
    startVoiceChat: 'Start Voice Chat with AI Avatar',
    voiceModeLabel: 'Voice Chat',
    textModeLabel: 'Text Input',
    pressToSpeak: 'Press to Speak',
    stopAndSend: 'Stop & Send',
    skipSpeech: 'Skip Speech',
    conversationComplete: 'Conversation Complete',
    processingScores: 'Processing scores from conversation...',

    // Experience Levels
    level1: '0-1 year (Novice)',
    level2: '1-2 years (Beginner)',
    level3: '2-3 years (Competent)',
    level4: '3+ years (Charge Nurse)',
    level5: '5+ years (Expert)',

    // Competency Types
    coreCompetency: 'Core Competency',
    functionalCompetency: 'Functional Competency',
    specificCompetency: 'Clinical Specialty',
    managerialCompetency: 'Managerial Competency',

    // Analytics
    averageByCategory: 'Average Score by Category',
    topWeaknesses: 'Top Areas for Development',
    scoreTrend: 'Score Trends Over Time',
    departmentComparison: 'Department Comparison',
    totalAssessments: 'Total Assessments',
    completedAssessments: 'Completed',
    approvedAssessments: 'Approved',
    totalNurses: 'Total Nurses',

    // Actions
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    search: 'Search',
    filter: 'Filter',
    download: 'Download',
    viewDetails: 'View Details',
    back: 'Back',
    confirm: 'Confirm',
    loading: 'Loading...',
    noData: 'No Data',

    // Report
    downloadPDF: 'Download PDF',
    assessmentReport: 'Competency Assessment Report',
    evaluationResults: 'Evaluation Results',
    assessmentDate: 'Assessment Date',
    department: 'Department',
    position: 'Position',
    experienceLevel: 'Experience Level',
  },
};

export const th = translations.th;
export const en = translations.en;

export function getTranslations(lang: Language) {
  return translations[lang];
}

export function getExperienceLevelLabels(lang: Language) {
  const t = translations[lang];
  return {
    LEVEL_1: t.level1,
    LEVEL_2: t.level2,
    LEVEL_3: t.level3,
    LEVEL_4: t.level4,
    LEVEL_5: t.level5,
  };
}

export function getStatusLabels(lang: Language) {
  const t = translations[lang];
  return {
    IN_PROGRESS: t.inProgress,
    SELF_ASSESSED: t.selfAssessed,
    AI_SCORED: t.aiScored,
    AI_FAILED: t.aiFailed,
    REVIEWED: t.reviewed,
    APPROVED: t.approved,
  };
}

// For backward compatibility
export const experienceLevelLabels: Record<string, string> = {
  LEVEL_1: th.level1,
  LEVEL_2: th.level2,
  LEVEL_3: th.level3,
  LEVEL_4: th.level4,
  LEVEL_5: th.level5,
};

export const statusLabels: Record<string, string> = {
  IN_PROGRESS: th.inProgress,
  SELF_ASSESSED: th.selfAssessed,
  AI_SCORED: th.aiScored,
  AI_FAILED: th.aiFailed,
  REVIEWED: th.reviewed,
  APPROVED: th.approved,
};

export const statusColors: Record<string, string> = {
  IN_PROGRESS: 'badge-gray',
  SELF_ASSESSED: 'badge-info',
  AI_SCORED: 'badge-warning',
  AI_FAILED: 'badge-danger',
  REVIEWED: 'badge-info',
  APPROVED: 'badge-success',
};
