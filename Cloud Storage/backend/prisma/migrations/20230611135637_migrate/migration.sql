/*
  Warnings:

  - Added the required column `userID` to the `FileLink` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userID" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "downloadLink" TEXT NOT NULL,
    "validUntil" TEXT NOT NULL
);
INSERT INTO "new_FileLink" ("downloadLink", "filename", "id", "validUntil") SELECT "downloadLink", "filename", "id", "validUntil" FROM "FileLink";
DROP TABLE "FileLink";
ALTER TABLE "new_FileLink" RENAME TO "FileLink";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
