-- CreateTable
CREATE TABLE "CurrentStateOnDelete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userID" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "nrRequests" INTEGER NOT NULL
);
