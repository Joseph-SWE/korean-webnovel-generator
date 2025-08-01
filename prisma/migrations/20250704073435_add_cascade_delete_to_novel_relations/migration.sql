-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "summary" TEXT,
    "cliffhanger" TEXT,
    "additionalData" TEXT,
    "novelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("additionalData", "cliffhanger", "content", "createdAt", "id", "novelId", "number", "summary", "title", "wordCount") SELECT "additionalData", "cliffhanger", "content", "createdAt", "id", "novelId", "number", "summary", "title", "wordCount" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
CREATE UNIQUE INDEX "Chapter_novelId_number_key" ON "Chapter"("novelId", "number");
CREATE TABLE "new_ChapterEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "characterId" TEXT,
    "plotlineId" TEXT,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ChapterEvent_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChapterEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChapterEvent_plotlineId_fkey" FOREIGN KEY ("plotlineId") REFERENCES "Plotline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChapterEvent" ("chapterId", "characterId", "description", "eventType", "id", "importance", "plotlineId") SELECT "chapterId", "characterId", "description", "eventType", "id", "importance", "plotlineId" FROM "ChapterEvent";
DROP TABLE "ChapterEvent";
ALTER TABLE "new_ChapterEvent" RENAME TO "ChapterEvent";
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "relationships" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("background", "description", "id", "name", "novelId", "personality", "relationships") SELECT "background", "description", "id", "name", "novelId", "personality", "relationships" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE TABLE "new_CharacterUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "developmentNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterUsage_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterUsage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CharacterUsage" ("chapterId", "characterId", "createdAt", "developmentNotes", "id", "role") SELECT "chapterId", "characterId", "createdAt", "developmentNotes", "id", "role" FROM "CharacterUsage";
DROP TABLE "CharacterUsage";
ALTER TABLE "new_CharacterUsage" RENAME TO "CharacterUsage";
CREATE TABLE "new_Plotline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "novelId" TEXT NOT NULL,
    CONSTRAINT "Plotline_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plotline" ("description", "id", "name", "novelId", "priority", "status") SELECT "description", "id", "name", "novelId", "priority", "status" FROM "Plotline";
DROP TABLE "Plotline";
ALTER TABLE "new_Plotline" RENAME TO "Plotline";
CREATE TABLE "new_PlotlineDevelopment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "plotlineId" TEXT NOT NULL,
    "developmentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlotlineDevelopment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlotlineDevelopment_plotlineId_fkey" FOREIGN KEY ("plotlineId") REFERENCES "Plotline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlotlineDevelopment" ("chapterId", "createdAt", "description", "developmentType", "id", "plotlineId") SELECT "chapterId", "createdAt", "description", "developmentType", "id", "plotlineId" FROM "PlotlineDevelopment";
DROP TABLE "PlotlineDevelopment";
ALTER TABLE "new_PlotlineDevelopment" RENAME TO "PlotlineDevelopment";
CREATE TABLE "new_WorldBuilding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "magicSystem" TEXT,
    "locations" TEXT,
    "cultures" TEXT,
    "timeline" TEXT,
    "rules" TEXT,
    CONSTRAINT "WorldBuilding_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorldBuilding" ("cultures", "id", "locations", "magicSystem", "novelId", "rules", "timeline") SELECT "cultures", "id", "locations", "magicSystem", "novelId", "rules", "timeline" FROM "WorldBuilding";
DROP TABLE "WorldBuilding";
ALTER TABLE "new_WorldBuilding" RENAME TO "WorldBuilding";
CREATE UNIQUE INDEX "WorldBuilding_novelId_key" ON "WorldBuilding"("novelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
