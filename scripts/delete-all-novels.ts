import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllNovels() {
  try {
    // Delete all novels, which will cascade delete related chapters, characters, plotlines, and world-building
    const deleteResult = await prisma.novel.deleteMany({});
    console.log(`Successfully deleted ${deleteResult.count} novels and all related data.`);
  } catch (error) {
    console.error('Error deleting novels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllNovels(); 