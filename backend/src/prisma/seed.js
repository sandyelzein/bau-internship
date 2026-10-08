// src/prisma/seed.js
// Seeds initial admin + sample committee member + sample students

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin Committee Member ──────────────────────────────────
  const adminPasswordHash = await bcrypt.hash('Admin@BAU2024', 10);

  const adminUser = await prisma.userAccount.upsert({
    where: { email: 'admin@bau.edu.lb' },
    update: {},
    create: {
      email: 'admin@bau.edu.lb',
      passwordHash: adminPasswordHash,
      role: 'COMMITTEE_MEMBER',
    },
  });

  await prisma.committeeMember.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      fullName: 'System Administrator',
      isAdmin: true,
      userId: adminUser.id,
    },
  });

  console.log('✅ Admin created: admin@bau.edu.lb / Admin@BAU2024');

  // ── Sample Committee Member ─────────────────────────────────
  const memberPasswordHash = await bcrypt.hash('Member@BAU2024', 10);

  const memberUser = await prisma.userAccount.upsert({
    where: { email: 'dr.khalil@bau.edu.lb' },
    update: {},
    create: {
      email: 'dr.khalil@bau.edu.lb',
      passwordHash: memberPasswordHash,
      role: 'COMMITTEE_MEMBER',
    },
  });

  await prisma.committeeMember.upsert({
    where: { userId: memberUser.id },
    update: {},
    create: {
      fullName: 'Dr. Ahmad Khalil',
      isAdmin: false,
      userId: memberUser.id,
    },
  });

  console.log('✅ Committee member created: dr.khalil@bau.edu.lb / Member@BAU2024');

  // ── Sample Students (as if imported via Excel) ──────────────
  const sampleStudents = [
    {
      studentId: '202012345',
      fullName: 'Sara Hassan',
      universityEmail: 'sara.hassan@students.bau.edu.lb',
      campus: 'Beirut',
      phone: '03123456',
      gpa: 3.75,
      completedCredits: 90,
      academicYear: 'Year 3',
    },
    {
      studentId: '202054321',
      fullName: 'Omar Nasser',
      universityEmail: 'omar.nasser@students.bau.edu.lb',
      campus: 'Tripoli',
      phone: '06987654',
      gpa: 3.20,
      completedCredits: 120,
      academicYear: 'Year 4',
    },
    {
      studentId: '202067890',
      fullName: 'Lina Fares',
      universityEmail: 'lina.fares@students.bau.edu.lb',
      campus: 'Beirut',
      phone: '71456789',
      gpa: 3.90,
      completedCredits: 60,
      academicYear: 'Year 2',
    },
  ];

  for (const s of sampleStudents) {
    await prisma.student.upsert({
      where: { studentId: s.studentId },
      update: s,
      create: s,
    });
  }

  console.log(`✅ ${sampleStudents.length} sample students seeded`);
  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
