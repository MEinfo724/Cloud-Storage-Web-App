-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" REAL NOT NULL,
    "folderID" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isFile" BOOLEAN NOT NULL,
    "mediaLink" TEXT NOT NULL,
    "selfLink" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "OwnerID" TEXT NOT NULL
);
