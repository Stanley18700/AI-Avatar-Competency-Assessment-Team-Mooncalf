import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding NurseMind AI database...');

  // ============== DEPARTMENTS ==============
  const deptGeneral = await prisma.department.create({
    data: { name: 'General Medicine Department', nameTh: 'แผนกอายุรกรรมทั่วไป', code: 'MED' }
  });
  const deptHealthCheck = await prisma.department.create({
    data: { name: 'Health Screening Unit', nameTh: 'หน่วยตรวจสุขภาพ', code: 'HSU' }
  });
  const deptSurgical = await prisma.department.create({
    data: { name: 'Surgical Ward', nameTh: 'แผนกศัลยกรรม', code: 'SUR' }
  });

  console.log('✅ Departments created');

  // ============== COMPETENCY GROUPS ==============
  // Core Competency (NOT assessed by AI)
  const coreGroup = await prisma.competencyGroup.create({
    data: {
      nameTh: 'สมรรถนะหลัก',
      nameEn: 'Core Competency',
      type: 'CORE',
      assessedByAI: false,
      sortOrder: 1
    }
  });

  // Functional Competency (assessed by AI)
  const functionalGroup = await prisma.competencyGroup.create({
    data: {
      nameTh: 'สมรรถนะตามบทบาทหน้าที่',
      nameEn: 'Functional Competency',
      type: 'FUNCTIONAL',
      assessedByAI: true,
      sortOrder: 2
    }
  });

  // Specific Competency (assessed by AI)
  const specificGroup = await prisma.competencyGroup.create({
    data: {
      nameTh: 'ประเด็นสำคัญทางคลินิก',
      nameEn: 'Specific Competency (Key Clinical Issues)',
      type: 'SPECIFIC',
      assessedByAI: true,
      sortOrder: 3
    }
  });

  // Managerial Competency (assessed by AI)
  const managerialGroup = await prisma.competencyGroup.create({
    data: {
      nameTh: 'สมรรถนะด้านการบริหาร',
      nameEn: 'Managerial Competency',
      type: 'MANAGERIAL',
      assessedByAI: true,
      sortOrder: 4
    }
  });

  console.log('✅ Competency groups created');

  // ============== CORE CRITERIA (not AI-assessed) ==============
  const coreCriteria = [
    { nameTh: 'การมุ่งผลสัมฤทธิ์', nameEn: 'Achievement Orientation', sortOrder: 1 },
    { nameTh: 'บริการที่ดี', nameEn: 'Good Service', sortOrder: 2 },
    { nameTh: 'การสั่งสมความเชี่ยวชาญในสาขาอาชีพ', nameEn: 'Accumulating Expertise in the Profession', sortOrder: 3 },
    { nameTh: 'จริยธรรม', nameEn: 'Ethics', sortOrder: 4 },
    { nameTh: 'ความร่วมแรงร่วมใจ', nameEn: 'Teamwork', sortOrder: 5 }
  ];

  for (const c of coreCriteria) {
    await prisma.competencyCriteria.create({
      data: { groupId: coreGroup.id, ...c }
    });
  }

  // ============== FUNCTIONAL CRITERIA (AI-assessed) ==============
  const funcCriteria = [
    { nameTh: 'จิตสำนึกการให้บริการ', nameEn: 'Commitment to patient-centered care', sortOrder: 1 },
    { nameTh: 'การแก้ไขปัญหาและการตัดสินใจ', nameEn: 'Problem-solving and clinical decision-making', sortOrder: 2 },
    { nameTh: 'การสร้างและรักษาสัมพันธภาพ', nameEn: 'Building and maintaining therapeutic relationships', sortOrder: 3 },
    { nameTh: 'การบริหารจัดการทางการพยาบาล', nameEn: 'Nursing management and administration', sortOrder: 4 }
  ];

  const funcCriteriaRecords = [];
  for (const c of funcCriteria) {
    const record = await prisma.competencyCriteria.create({
      data: { groupId: functionalGroup.id, ...c }
    });
    funcCriteriaRecords.push(record);
  }

  // ============== SPECIFIC CRITERIA (AI-assessed, varies by dept) ==============
  const specCriteria = [
    { nameTh: 'ประเด็นสำคัญทางคลินิกเรื่อง: การดูแลและการให้บริการผู้รับบริการ', nameEn: 'Key clinical issues: Care and services for patients', sortOrder: 1 },
    { nameTh: 'ประเด็นสำคัญทางคลินิกเรื่อง: ความพึงพอใจของผู้รับบริการ', nameEn: 'Key clinical issues: Patient satisfaction', sortOrder: 2 }
  ];

  const specCriteriaRecords = [];
  for (const c of specCriteria) {
    const record = await prisma.competencyCriteria.create({
      data: { groupId: specificGroup.id, ...c }
    });
    specCriteriaRecords.push(record);
  }

  // Link specific criteria to departments
  await prisma.departmentClinicalIssue.create({
    data: {
      departmentId: deptHealthCheck.id,
      criteriaId: specCriteriaRecords[0].id,
      nameTh: 'การดูแลและการให้บริการผู้รับบริการหน่วยตรวจสุขภาพ',
      nameEn: 'Care and services for patients at the health checkup unit'
    }
  });
  await prisma.departmentClinicalIssue.create({
    data: {
      departmentId: deptHealthCheck.id,
      criteriaId: specCriteriaRecords[1].id,
      nameTh: 'ความพึงพอใจของผู้รับบริการหน่วยตรวจสุขภาพ',
      nameEn: 'Patient satisfaction at health checkup units'
    }
  });
  await prisma.departmentClinicalIssue.create({
    data: {
      departmentId: deptGeneral.id,
      criteriaId: specCriteriaRecords[0].id,
      nameTh: 'การดูแลผู้ป่วยอายุรกรรม',
      nameEn: 'Care for general medicine patients'
    }
  });
  await prisma.departmentClinicalIssue.create({
    data: {
      departmentId: deptSurgical.id,
      criteriaId: specCriteriaRecords[0].id,
      nameTh: 'การดูแลผู้ป่วยก่อนและหลังผ่าตัด',
      nameEn: 'Pre and post-operative patient care'
    }
  });

  // ============== MANAGERIAL CRITERIA (AI-assessed) ==============
  const mgrCriteria = [
    { nameTh: 'ความเป็นผู้นำ', nameEn: 'Leadership', sortOrder: 1 },
    { nameTh: 'วิสัยทัศน์', nameEn: 'Vision', sortOrder: 2 },
    { nameTh: 'ศักยภาพเพื่อนำการเปลี่ยนแปลง', nameEn: 'Potential for leading change', sortOrder: 3 },
    { nameTh: 'การควบคุมตัวเอง', nameEn: 'Self-control', sortOrder: 4 },
    { nameTh: 'การพัฒนาศักยภาพ', nameEn: 'Potential development', sortOrder: 5 }
  ];

  const mgrCriteriaRecords = [];
  for (const c of mgrCriteria) {
    const record = await prisma.competencyCriteria.create({
      data: { groupId: managerialGroup.id, ...c }
    });
    mgrCriteriaRecords.push(record);
  }

  console.log('✅ All competency criteria created');

  // ============== STANDARD LEVELS ==============
  // Standard levels for ALL criteria (Core + AI-assessed) — per Nursing Council Standards
  // In the real form, all criteria for a given experience level share the same standard score
  // (Level 1 = standard 1, Level 2 = standard 2, etc.)
  const allCriteriaForStandards = await prisma.competencyCriteria.findMany({ where: { active: true } });
  const levels: string[] = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'];

  for (const criteria of allCriteriaForStandards) {
    for (let i = 0; i < levels.length; i++) {
      await prisma.standardLevel.create({
        data: {
          experienceLevel: levels[i],
          criteriaId: criteria.id,
          standardScore: i + 1 // Level 1 = standard 1, Level 2 = standard 2, etc.
        }
      });
    }
  }

  console.log('✅ Standard levels created (all criteria including Core)');

  // ============== USERS ==============
  const passwordHash = await bcrypt.hash('password123', 12);

  // Build AI criteria IDs for case linkage
  const allAICriteria = [...funcCriteriaRecords, ...specCriteriaRecords, ...mgrCriteriaRecords];

  await prisma.user.create({
    data: {
      email: 'admin@nursemind.ai',
      passwordHash,
      name: 'Admin User',
      nameTh: 'ผู้ดูแลระบบ',
      role: 'ADMIN',
      experienceLevel: 'LEVEL_5'
    }
  });

  await prisma.user.create({
    data: {
      email: 'nurse1@nursemind.ai',
      passwordHash,
      name: 'Somchai Nurse',
      nameTh: 'สมชาย พยาบาล',
      role: 'NURSE',
      departmentId: deptGeneral.id,
      experienceLevel: 'LEVEL_1'
    }
  });

  await prisma.user.create({
    data: {
      email: 'nurse2@nursemind.ai',
      passwordHash,
      name: 'Somsri Nurse',
      nameTh: 'สมศรี พยาบาล',
      role: 'NURSE',
      departmentId: deptHealthCheck.id,
      experienceLevel: 'LEVEL_3'
    }
  });

  await prisma.user.create({
    data: {
      email: 'reviewer@nursemind.ai',
      passwordHash,
      name: 'Pranee Reviewer',
      nameTh: 'ปราณี หัวหน้า',
      role: 'REVIEWER',
      departmentId: deptGeneral.id,
      experienceLevel: 'LEVEL_5'
    }
  });

  console.log('✅ Users created');

  // ============== SAMPLE CASES ==============
  const allCriteriaIds = allAICriteria.map(c => c.id);

  await prisma.case.create({
    data: {
      title: 'Post-operative Patient Deterioration',
      titleTh: 'ผู้ป่วยหลังผ่าตัดมีอาการทรุดลง',
      descriptionTh: `คุณเป็นพยาบาลเวรดึกที่ดูแลหอผู้ป่วยศัลยกรรม ได้รับมอบหมายให้ดูแลผู้ป่วยชายอายุ 65 ปี ชื่อ นายสมบูรณ์ หลังผ่าตัดเปลี่ยนข้อเข่าเทียมเมื่อ 6 ชั่วโมงก่อน

ขณะตรวจเยี่ยม (rounding) เวลา 02:00 น. คุณพบว่า:
- ผู้ป่วยมีไข้ 38.5°C (เดิม 37.2°C)
- ความดันโลหิต 90/60 mmHg (เดิม 130/80 mmHg)
- ชีพจร 110 ครั้ง/นาที (เดิม 78 ครั้ง/นาที)
- หายใจ 24 ครั้ง/นาที
- ผู้ป่วยบ่นปวดแผลมากขึ้น คะแนนปวด 8/10
- แผลผ่าตัดบวมแดงมากขึ้น มี discharge สีขุ่น
- ผู้ป่วยรู้สึกกระสับกระส่าย สับสนเล็กน้อย

กรุณาอธิบายว่าคุณจะจัดการสถานการณ์นี้อย่างไร รวมถึง:
1. การประเมินผู้ป่วย
2. การดำเนินการเบื้องต้น
3. การสื่อสารกับทีมสหวิชาชีพ
4. การวางแผนดูแลต่อเนื่อง`,
      descriptionEn: `You are a night-shift nurse on the surgical ward, assigned to care for Mr. Somboon, a 65-year-old male patient, 6 hours after total knee replacement surgery.

During your 02:00 AM rounding, you find:
- Temperature: 38.5°C (previously 37.2°C)
- BP: 90/60 mmHg (previously 130/80 mmHg)
- HR: 110 bpm (previously 78 bpm)
- RR: 24/min
- Patient complains of increased wound pain, pain score 8/10
- Surgical wound is more swollen and reddened, with cloudy discharge
- Patient is restless and slightly confused

Explain how you would manage this situation, including:
1. Patient assessment
2. Initial interventions
3. Communication with the healthcare team
4. Continuing care plan`,
      reasoningIndicators: JSON.stringify([
        'ABCDE assessment or systematic vital signs review',
        'Recognition of sepsis indicators (SIRS criteria)',
        'Escalation using SBAR communication',
        'Immediate interventions (IV fluids, oxygen, positioning)',
        'Wound assessment and infection control measures',
        'Pain management considerations',
        'Documentation and monitoring plan',
        'Patient and family communication'
      ]),
      linkedCriteriaIds: JSON.stringify(allCriteriaIds),
      departmentId: deptSurgical.id
    }
  });

  await prisma.case.create({
    data: {
      title: 'Medication Error Prevention',
      titleTh: 'การป้องกันความผิดพลาดจากการใช้ยา',
      descriptionTh: `คุณเป็นพยาบาลประจำหอผู้ป่วยอายุรกรรม ขณะเตรียมยาเวรเช้า คุณพบว่า:

ผู้ป่วยหญิง อายุ 72 ปี ชื่อ นางสมหญิง เข้ารับการรักษาด้วยโรคเบาหวานและความดันโลหิตสูง มีการสั่งยาดังนี้:
- Metformin 500 mg oral BID
- Amlodipine 10 mg oral OD
- Insulin Glargine 20 units SC HS

แต่ในตะกร้ายาของผู้ป่วย คุณพบ:
- Metformin 500 mg ✓
- Amlodipine 10 mg ✓  
- Insulin Regular 20 units (แทน Insulin Glargine)

นอกจากนี้ คุณสังเกตว่า:
- ผู้ป่วยมีผลเลือด Creatinine 2.5 mg/dL (สูงกว่าปกติ)
- ผู้ป่วยบอกว่ามีอาการคลื่นไส้ เบื่ออาหารตั้งแต่เมื่อวาน
- ระดับน้ำตาลในเลือดล่าสุด 65 mg/dL

กรุณาอธิบาย:
1. ปัญหาที่คุณพบและการวิเคราะห์
2. การดำเนินการที่เหมาะสม
3. กาารป้องกันไม่ให้เกิดซ้ำ
4. การสื่อสารกับผู้ป่วยและทีม`,
      descriptionEn: `You are a nurse on the general medicine ward. While preparing morning medications, you discover:

Mrs. Somying, a 72-year-old female patient admitted for diabetes and hypertension, has the following medication orders:
- Metformin 500 mg oral BID
- Amlodipine 10 mg oral OD
- Insulin Glargine 20 units SC HS

However, in the patient's medication tray, you find:
- Metformin 500 mg ✓
- Amlodipine 10 mg ✓
- Insulin Regular 20 units (instead of Insulin Glargine)

Additionally, you notice:
- Patient's Creatinine level: 2.5 mg/dL (elevated)
- Patient reports nausea and loss of appetite since yesterday
- Latest blood glucose: 65 mg/dL

Please explain:
1. Problems identified and your analysis
2. Appropriate actions
3. Prevention strategies
4. Communication with the patient and team`,
      reasoningIndicators: JSON.stringify([
        'Identification of wrong insulin type (Regular vs Glargine)',
        'Recognition of elevated creatinine and Metformin risk (lactic acidosis)',
        'Low blood glucose recognition and management',
        'Medication reconciliation process',
        'SBAR communication to physician',
        'Patient education about medications',
        'Documentation and incident reporting',
        'System-level prevention strategies'
      ]),
      linkedCriteriaIds: JSON.stringify(allCriteriaIds),
      departmentId: deptGeneral.id
    }
  });

  await prisma.case.create({
    data: {
      title: 'Patient Fall Risk Assessment',
      titleTh: 'การประเมินความเสี่ยงผู้ป่วยพลัดตกหกล้ม',
      descriptionTh: `คุณเป็นพยาบาลหน่วยตรวจสุขภาพ ขณะให้บริการตรวจสุขภาพประจำปี คุณได้รับผู้ป่วยรายใหม่:

นางสาวมาลี อายุ 78 ปี มาตรวจสุขภาพประจำปีคนเดียว มีประวัติ:
- เบาหวาน ควบคุมไม่ดี (HbA1c 9.2%)
- ความดันโลหิตสูง รับประทานยาลดความดัน
- เคยล้มหกเมื่อ 2 เดือนก่อน มีรอยฟกช้ำที่แขน
- สายตามองเห็นไม่ชัด ยังไม่ได้ไปพบจักษุแพทย์
- ใช้ไม้เท้าเดิน แต่วันนี้ลืมมา
- บ่นว่ามีอาการเวียนศีรษะเวลาลุกขึ้นยืน

ขณะตรวจ คุณสังเกตว่า:
- ผู้ป่วยเดินไม่มั่นคง ทรงตัวไม่ดี
- ความดันขณะนอน 150/90 mmHg, ขณะยืน 120/70 mmHg  
- ผู้ป่วยไม่ได้ทานยาเบาหวานมา 2 วัน เพราะยาหมด

กรุณาอธิบาย:
1. การประเมินความเสี่ยงของผู้ป่วย
2. การดูแลเบื้องต้นขณะอยู่ในหน่วย
3. การให้คำแนะนำผู้ป่วยและญาติ
4. การประสานงานกับทีมสหวิชาชีพ
5. การวางแผนการดูแลต่อเนื่อง`,
      descriptionEn: `You are a nurse at the Health Screening Unit. During annual health check-up services, you receive a new patient:

Ms. Mali, 78 years old, comes alone for an annual health check-up with the following history:
- Poorly controlled diabetes (HbA1c 9.2%)
- Hypertension, on antihypertensive medication
- Previous fall 2 months ago with arm bruising
- Poor vision, hasn't seen an ophthalmologist yet
- Usually walks with a cane but forgot it today
- Complains of dizziness when standing up

During examination, you observe:
- Unsteady gait, poor balance
- BP supine: 150/90 mmHg, standing: 120/70 mmHg
- Patient hasn't taken diabetes medication for 2 days (ran out)

Please explain:
1. Patient risk assessment
2. Initial care during the unit visit
3. Patient and family education
4. Multidisciplinary team coordination
5. Continuing care plan`,
      reasoningIndicators: JSON.stringify([
        'Fall risk assessment using validated tool (Morse Fall Scale)',
        'Orthostatic hypotension recognition',
        'Medication compliance assessment',
        'Diabetes management concerns',
        'Environmental safety measures',
        'Multidisciplinary referrals (ophthalmology, PT, pharmacy)',
        'Patient education on fall prevention',
        'Follow-up care coordination'
      ]),
      linkedCriteriaIds: JSON.stringify(allCriteriaIds),
      departmentId: deptHealthCheck.id
    }
  });

  console.log('✅ Sample cases created');
  console.log('');
  console.log('🎉 Seed complete! Login credentials:');
  console.log('  Admin:    admin@nursemind.ai / password123');
  console.log('  Nurse 1:  nurse1@nursemind.ai / password123');
  console.log('  Nurse 2:  nurse2@nursemind.ai / password123');
  console.log('  Reviewer: reviewer@nursemind.ai / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
