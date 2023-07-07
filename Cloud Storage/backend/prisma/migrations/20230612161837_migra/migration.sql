/*
  Warnings:

  - You are about to drop the column `nrRequests` on the `CurrentStateOnDelete` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CurrentStateOnDelete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userID" TEXT NOT NULL,
    "state" TEXT NOT NULL
);
INSERT INTO "new_CurrentStateOnDelete" ("id", "state", "userID") SELECT "id", "state", "userID" FROM "CurrentStateOnDelete";
DROP TABLE "CurrentStateOnDelete";
ALTER TABLE "new_CurrentStateOnDelete" RENAME TO "CurrentStateOnDelete";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
