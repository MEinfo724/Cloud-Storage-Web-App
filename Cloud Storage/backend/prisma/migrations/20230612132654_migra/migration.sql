/*
  Warnings:

  - Added the required column `nrRequests` to the `CurrentState` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CurrentState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userID" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "nrRequests" INTEGER NOT NULL
);
INSERT INTO "new_CurrentState" ("id", "state", "userID") SELECT "id", "state", "userID" FROM "CurrentState";
DROP TABLE "CurrentState";
ALTER TABLE "new_CurrentState" RENAME TO "CurrentState";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
