import express, { Express, Request, Response, NextFunction } from 'express';

import { auth } from 'firebase-admin';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client'
import cors from "cors";
import { Bucket, Storage } from '@google-cloud/storage'
import fs from 'fs';
import archiver from 'archiver';
import path, { dirname } from 'path';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

dotenv.config();

const prisma = new PrismaClient()
const app: Express = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());
//<------------------------------------------------------------GOOGLE CLOUD AND FIREBASE SETUP------------------------------------------------------------> BEGIN
const projectId = process.env.GOOGLE_PROJECT_ID as string;
const client_email = process.env.GOOGLE_CLIENT_EMAIL as string;
const private_key = process.env.GOOGLE_PRIVATE_KEY as string;
const priv_key = private_key.replace(/\\n/g, '\n');
const bucketName = process.env.GOOGLE_BUCKET_NAME as string;

const storage = new Storage({
  projectId: projectId,
  credentials: {
    client_email: client_email,
    private_key: priv_key
  }
});
async function getBucketMetadata() {
  const [metadata] = await storage.bucket(bucketName).getMetadata();
  console.log(JSON.stringify(metadata, null, 2));
}
//getBucketMetadata();
const admin = require('firebase-admin');
//var serviceAccount = require("D:/Facultate An3/LICENTA/backend/react-auth-be3fe-firebase-adminsdk-plb10-f02c1006d2.json");
var serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY ?? '');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

interface CustomRequest extends Request {
  user?: auth.DecodedIdToken;
}
const util = require('util');
const sleep = util.promisify(setTimeout);

const verifyUserMiddleware = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  try {
    // Extract the JWT token from the Authorization header
    const token = authorization && authorization.split(' ')[1];

    // Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach the user object to the request

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
app.use(verifyUserMiddleware);
//<------------------------------------------------------------GOOGLE CLOUD AND FIREBASE SETUP------------------------------------------------------------> END
//<------------------------------------------------------------CLEANUP------------------------------------------------------------> BEGIN
async function CleanFiles() {
  console.log('Cleanup Function Called');

  try {
    const bucket = await storage.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: "zip-" });
    const currentTime = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    for (const file of files) {

      const [metadata] = await file.getMetadata();
      const updatedTime = Date.parse(metadata.updated);
      const timeDifference = (Date.now() - updatedTime) / 3600000;

      if (timeDifference >= 24) {
        await file.delete();
        console.log(`Deleted file: ${file.name}`);
      }
      else {
        //console.log(`File: ${file.name} will be deleted in ${24 - timeDifference} hours`)
      }

    }
    const [badFiles] = await bucket.getFiles({ prefix: "tmp-" });
    for (const file of badFiles) {
      const [metadata] = await file.getMetadata();
      const updatedTime = Date.parse(metadata.updated);
      const timeDifference = (Date.now() - updatedTime) / 3600000;

      if (timeDifference >= 24) {
        await file.delete();
        console.log(`Deleted file: ${file.name}`);
      }
      else {
        //console.log(`File: ${file.name} will be deleted in ${24 - timeDifference} hours`)
      }

    }

  }
  catch (error) {
    console.error(error);
  }

  setTimeout(CleanFiles, 2 * 60 * 60 * 1000); // Call the function again after 2 hours
}

// Start the function immediately
CleanFiles();
//<------------------------------------------------------------CLEANUP------------------------------------------------------------> END
function checkParamsValidity(parameter: string) {
  if (/[\\:?"<>|]/.test(parameter)) {
    return false;
  }
  let array: string[] = parameter.split("/");
  if (parameter.lastIndexOf("/") === parameter.length - 1) {
    for (let i = 0; i < array.length - 1; i++) {
      const element = array[i];
      if (!/^\d{13}-\S/.test(element)) {
        return false;
      }
    }
    const lastElement = array[array.length - 1];
    if (lastElement !== "") {
      return false
    }
  }
  else {
    for (let i = 0; i < array.length; i++) {
      const element = array[i];
      if (!/^\d{13}-\S/.test(element)) {
        return false;
      }
    }
  }
  return true;
}
function checkParamsValidity1(parameter: string, root: string) {
  let prefix: string = parameter.substring(0, 18);
  if (!/^tmp-\d{13}-$/.test(prefix)) {
    return false;
  }
  parameter = parameter.substring(18);
  if (!parameter.startsWith(root)) {
    return false;
  }
  parameter = parameter.replace(root, "");
  if (parameter[0] !== "-") {
    return false;
  }
  if (parameter[1] === " ") {
    return false;
  }
  if (/[\\:?"<>|]/.test(parameter)) {
    return false;
  }
  return true;
}
function checkParamsValidity2(parameter: string) {
  if (/[\\:?"<>|/]/.test(parameter)) {
    return false;
  }
  if (parameter[0] === " ") {
    return false;
  }
  return true;
}
function checkParamsValidity3(parameter: string, root: string) {
  let prefix: string = parameter.substring(0, 4);

  if (prefix !== "zip-") {
    return false;
  }
  parameter = parameter.substring(4);
  if (!parameter.startsWith(root)) {
    return false;
  }
  parameter = parameter.replace(root, "");
  if (!/^(\d{13})-(?!\s)(.*[^ ])\.zip$/.test(parameter)) {
    return false;
  }
  return true;
}
app.get('/:currentPath', async (req: CustomRequest, res: Response) => {

  try {
    const currPath = req.params.currentPath.replace(/\*/g, '/');
    const bucket = await storage.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: currPath });
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      const reqRoot = currPath.substring(0, currPath.indexOf('/'));

      if (userRoot !== reqRoot) {
        throw new Error('Unauthorized');
      }
    }
    const fileNames =
      files.map((file) => {

        //daca suntem in foldergol
        if (currPath === file.name) {
          return {
          }
        }
        //daca fisierul se afla in directorul currPath
        if ((file.name.slice(0, file.name.lastIndexOf("/") + 1) === currPath)) {
          return {
            id: file.name,
            name: file.name.slice(file.name.lastIndexOf("/") + 1).slice(14),
            isFile: true,
            fileType: file.metadata.contentType ? file.metadata.contentType : null
          };
        }
        //daca fisierul se afla in subdirectoare
        else {
          //luam numele subdirectorului

          let someString: string = file.name.replace(currPath, "");
          someString = someString.slice(0, someString.indexOf("/") + 1);
          return {
            id: currPath.concat(someString),
            name: someString.slice(0, someString.indexOf("/")).slice(14),
            isFile: false,
            fileType: "folder",
          }
        }
      });

    //aratam doar folderele unice
    const uniqItems = fileNames.filter(
      (item, index, self) => index === self.findIndex(i => i.id === item.id)
    )
    const sortedItems = uniqItems.sort((a, b) => {
      if (!a.name) {
        return -1;
      }
      if (!b.name) {
        return 1;
      }

      if (!a.isFile && b.isFile) {
        return -1;
      }
      if (a.isFile && !b.isFile) {
        return 1;
      }
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (!a.isFile && !b.isFile) {
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
      }
      if (a.isFile && b.isFile) {
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
      }
      return 0;
    })
    res.send(sortedItems);
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post("/:filename", async (req: CustomRequest, res: Response) => {

  try {
    const bucket = await storage.bucket(bucketName);
    const filename = req.params.filename.replace(/\*/g, '/');
    const checkValid = filename.substring(filename.indexOf("/") + 1);
    if (!checkParamsValidity(checkValid)) {
      throw new Error('Invalid parameters');
    }
    //Verificam ca requestul de post al userului X merge catre folderul userului X
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      const reqRoot = filename.substring(0, filename.indexOf('/'));

      if (userRoot !== reqRoot) {
        throw new Error('Unauthorized');
      }
    }

    const fileContents = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      req.on('error', (err) => {
        reject(err);
      });
    });
    //daca este fisier
    if (filename.charAt(filename.length - 1) != "/") {
      const parentOfFile = filename.substring(0, filename.lastIndexOf("/") + 1);
      const fileName = filename.substring(filename.lastIndexOf("/") + 15);
      const [files] = await bucket.getFiles({ prefix: parentOfFile, delimiter: "/" });

      const fileNames = files.map((file) => {

        //daca fisierul are o extensie
        if (fileName.indexOf(".") !== -1) {

          const auxName = file.name.slice(file.name.lastIndexOf("/") + 15);
          //si acea extensie este identica
          if (auxName.substring(auxName.lastIndexOf(".")) === filename.substring(filename.lastIndexOf("."))) {
            //returnam acel fisier
            return auxName.substring(0, auxName.lastIndexOf("."));
          }
        }
        //daca fisierul nu are o extensie
        else if (fileName.indexOf(".") === -1) {
          // returnam fisierul indiferent de extensia acestuia
          return file.name.slice(file.name.lastIndexOf("/") + 15);
        }

      });

      //daca fisierul are o extensie scapam de ea
      if (fileName.indexOf(".") !== -1) {
        var thisFileName: string = fileName.substring(0, fileName.lastIndexOf("."));
      }
      else {
        var thisFileName: string = fileName;
      }

      function getUniqueString(existingStrings: any, newString: string) {
        let uniqueString = newString;
        let counter = 1;

        const regex = /\((\d+)\)$/; // Matches a closing parenthesis followed by a number at the end of the string

        while (existingStrings.includes(uniqueString)) {
          const match = uniqueString.match(regex);
          if (match) {
            const existingNumber = parseInt(match[1]);
            const updatedNumber = existingNumber + 1;
            uniqueString = uniqueString.replace(regex, `(${updatedNumber})`);
          } else {
            uniqueString = `${newString} (${counter})`;
            counter++;
          }
        }

        return uniqueString;
      }

      thisFileName = getUniqueString(fileNames, thisFileName);
      //daca fisierul avea o extensie i-o adaugam 
      if (fileName.indexOf(".") !== -1) {
        thisFileName = thisFileName + fileName.substring(fileName.lastIndexOf("."));
      }
      thisFileName = filename.substring(0, filename.lastIndexOf("/") + 15) + thisFileName;

    }
    else {
      var thisFileName: string = filename.substring(0, filename.length - 1);
      thisFileName = thisFileName.substring(thisFileName.lastIndexOf("/") + 15);
      let parentOfDir: string = filename.substring(0, filename.length - 1);

      parentOfDir = parentOfDir.substring(0, parentOfDir.lastIndexOf("/") + 1);


      const [directories] = await bucket.getFiles({ prefix: parentOfDir });

      const dirNames = directories.map((dir) => {

        if (dir.name.charAt(dir.name.length - 1) === "/" && dir.name.split("/").length - 1 == filename.split("/").length - 1) {
          let dirPrefix = dir.name.substring(0, dir.name.length - 1);
          dirPrefix = dirPrefix.slice(dirPrefix.lastIndexOf("/") + 15);
          return dirPrefix;
        }
        return null;
      }).filter((name) => name !== null);

      function getUniqueString(existingStrings: any, newString: string) {
        let uniqueString = newString;
        let counter = 1;

        const regex = /\((\d+)\)$/; // Matches a closing parenthesis followed by a number at the end of the string

        while (existingStrings.includes(uniqueString)) {
          const match = uniqueString.match(regex);
          if (match) {
            const existingNumber = parseInt(match[1]);
            const updatedNumber = existingNumber + 1;
            uniqueString = uniqueString.replace(regex, `(${updatedNumber})`);
          } else {
            uniqueString = `${newString} (${counter})`;
            counter++;
          }
        }

        return uniqueString;
      }
      thisFileName = getUniqueString(dirNames, thisFileName);

      thisFileName = thisFileName + "/";
      let thisPrefix: string = filename.substring(0, filename.lastIndexOf("/"));
      thisPrefix = thisPrefix.substring(0, thisPrefix.lastIndexOf("/") + 15);
      thisFileName = thisPrefix + thisFileName;


    }

    if (filename.charAt(filename.length - 1) != "/") {

      var rootOffile: string = filename.substring(0, filename.lastIndexOf("/") + 1);

    }
    else {

      var rootOffile: string = filename.substring(0, filename.lastIndexOf("/"));
      rootOffile = rootOffile.substring(0, rootOffile.lastIndexOf("/") + 1);
    }

    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email + "/";
      console.log("file:", rootOffile);
      console.log("root", userRoot);
      let currentState: any = null;

      if (rootOffile !== userRoot) {
        currentState = await prisma.currentStateOnUpload.create({
          data: {
            userID: userRoot,
            fileName: rootOffile,
          },
        });
      } else {
        console.log("Nivelul 1");
      }

      await bucket.file(thisFileName).save(fileContents).then(async () => {
        if (currentState) {
          await prisma.currentStateOnUpload.delete({
            where: {
              id: currentState.id,
            },
          });
          console.log("Current state deleted");
        }
      });
    }

    res.send("File reached Backend");


  }
  catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      res.status(401).send('Unauthorized');
    } else {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  }
});

app.delete("/:filename", async (req: CustomRequest, res: Response) => {

  try {
    console.log("delete");
    const bucket = await storage.bucket(bucketName);

    const filename = req.params.filename.replace(/\*/g, '/');

    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      const reqRoot = filename.substring(0, filename.indexOf('/'));

      const currentState = await prisma.currentState.findUnique({
        where: {
          id: filename,
        },
      });

      if (currentState) {
        throw new Error('You can not do this now!');
      }

      if (userRoot !== reqRoot) {
        throw new Error('Unauthorized');
      }
    }
    if (filename.charAt(filename.length - 1) === "/") {
      //luam toate fisierele din dir si sub dir
      const [files] = await bucket.getFiles({ prefix: filename });
      //verificam sa nu existe un request de download
      await prisma.$transaction(async (transaction) => {
        for (const file of files) {
          const existingState = await prisma.currentState.findUnique({
            where: {
              id: file.name,
            },
          });
          if (existingState) {
            throw new Error('You can not do this now!');
          }
        }
      });
      await prisma.$transaction(async (transaction) => {
        for (const file of files) {
          const existingState = await prisma.currentStateOnUpload.findFirst({
            where: {
              fileName: file.name,
            },
          });
          if (existingState) {
            throw new Error('You can not do this now!');
          }
        }
      });
      await prisma.$transaction(async (transaction) => {
        for (const file of files) {
          let newState;
          const existingState = await prisma.currentStateOnDelete.findUnique({
            where: {
              id: file.name,
            },
          });
          if (!existingState) {
            if (req.user?.email && req.user?.uid) {
              const userRoot = req.user.uid + req.user.email;
              newState = await prisma.currentStateOnDelete.create({
                data: {
                  id: file.name,
                  userID: userRoot,
                  state: 'deleting',
                },
              });
            }
          }
        }
      });
      //si le stergem
      await prisma.$transaction(async (transaction) => {
        for (const file of files) {
          await file.delete();
          await prisma.currentStateOnDelete.delete({
            where: {
              id: file.name,
            },
          });
          const existingFileLink = await prisma.fileLink.findUnique({
            where: {
              id: file.name,
            },
          });
          if (existingFileLink) {
            await prisma.fileLink.delete({
              where: {
                id: file.name,
              },
            });
          }
        }
      });
    }
    //daca e fisier
    else {
      const file = bucket.file(filename);
      await file.delete();
      const existingFileLink = await prisma.fileLink.findUnique({
        where: {
          id: file.name,
        },
      });
      if (existingFileLink) {
        await prisma.fileLink.delete({
          where: {
            id: file.name,
          },
        });
      }
    }


    res.send("File got deleted");
  }
  catch (error) {
    console.error(error);
    if (typeof error === 'object' && error !== null) {
      const typedError = error as Error;

      if (typedError.message === 'You can not do this now!') {
        res.status(403).send('You can not do this now!');
      } else {
        res.status(500).send('Internal server error');
      }
    } else {
      res.status(500).send('Internal server error');
    }

  }
});

app.post("/uploadFolder/:filename", async (req: CustomRequest, res: Response) => {

  try {
    const filename = req.params.filename.replace(/\*/g, '/');
    const checkValid = filename.substring(filename.indexOf("/") + 1);
    if (!checkParamsValidity(checkValid)) {
      throw new Error('Invalid parameters');
    }
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      let reqRoot: string = filename.substring(0, filename.indexOf('/'));
      if (!checkParamsValidity1(reqRoot, userRoot)) {
        throw new Error('Invalid parameters');
      }
    }

    const bucket = await storage.bucket(bucketName);
    const fileContents = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      req.on('error', (err) => {
        reject(err);
      });
    });
    await bucket.file(filename).save(fileContents);

    res.send("File reached Backend");


  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


app.put("/uploadFolder/finalize", async (req: CustomRequest, res: Response) => {

  try {
    const bucket = await storage.bucket(bucketName);
    const oldPath = req.body.oldPath.replace(/\*/g, '/');
    const newPath = req.body.newPath.replace(/\*/g, '/');
    let directoryName: string = req.body.directoryName;

    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      if (!checkParamsValidity1(oldPath.substring(0, oldPath.indexOf("/")), userRoot)) {
        throw new Error('Invalid parameters');
      }
      let newpathPrefix: string = newPath.substring(0, newPath.indexOf("/"));
      if (newpathPrefix !== userRoot) {
        throw new Error('Unauthorized');
      }
      if (!checkParamsValidity2(directoryName)) {
        throw new Error('Invalid parameters');
      }
      const checkValid = newPath.substring(newPath.indexOf("/") + 1);
      if (!checkParamsValidity(checkValid)) {
        throw new Error('Invalid parameters');
      }

    }

    const [directories] = await bucket.getFiles({ prefix: newPath });

    const dirNames = directories.map((dir) => {

      if (dir.name.charAt(dir.name.length - 1) === "/" && dir.name.split("/").length - 1 == newPath.split("/").length) {
        let dirPrefix = dir.name.substring(0, dir.name.length - 1);
        dirPrefix = dirPrefix.slice(dirPrefix.lastIndexOf("/") + 15);
        return dirPrefix;
      }
      return null;
    }).filter((name) => name !== null);

    function getUniqueString(existingStrings: any, newString: string) {
      let uniqueString = newString;
      let counter = 1;

      const regex = /\((\d+)\)$/; // Matches a closing parenthesis followed by a number at the end of the string

      while (existingStrings.includes(uniqueString)) {
        const match = uniqueString.match(regex);
        if (match) {
          const existingNumber = parseInt(match[1]);
          const updatedNumber = existingNumber + 1;
          uniqueString = uniqueString.replace(regex, `(${updatedNumber})`);
        } else {
          uniqueString = `${newString} (${counter})`;
          counter++;
        }
      }

      return uniqueString;
    }

    directoryName = getUniqueString(dirNames, directoryName);

    await sleep(500);
    console.log("Timeout");
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email + "/";
      if (userRoot !== newPath) {
        console.log("here");
        const file = bucket.file(newPath);
        const [exists] = await file.exists();
        if (!exists) {
          throw new Error('You can not do this now!');
        }
        const thisState = await prisma.currentStateOnDelete.findUnique({
          where: {
            id: newPath,
          },
        });
        if (thisState) {
          throw new Error('You can not do this now!');
        }

        var currentState: any = null;
        currentState = await prisma.currentStateOnUpload.create({
          data: {
            userID: userRoot,
            fileName: newPath,
          },
        });
      }
    }
    //
    const [files] = await bucket.getFiles({ prefix: oldPath });
    const dateStamp = Date.now();
    await bucket.file(newPath + dateStamp + '-' + directoryName + "/").save('');

    let i: number = 0;
    for (const file of files) {
      const finalPath = file.name.replace(oldPath, newPath + dateStamp + '-' + directoryName + "/")
      await bucket.file(file.name).move(finalPath);
      if (i == files.length - 1) {
        if (currentState) {
          await prisma.currentStateOnUpload.delete({
            where: {
              id: currentState.id,
            },
          });
          console.log("Current state deleted");
        }
      }
      i = i + 1;
    }
    res.send("Path has changed");
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/downloadFile/:downloadPath', async (req: CustomRequest, res: Response) => {
  try {
    const currPath = req.params.downloadPath.replace(/\*/g, '/');
    const bucket = await storage.bucket(bucketName);
    const file = await bucket.file(currPath);
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      const reqRoot = currPath.substring(0, currPath.indexOf('/'));

      if (userRoot !== reqRoot) {
        throw new Error('Unauthorized');
      }
    }
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000,//24h
      responseDisposition: `attachment; filename="${file.name.slice(file.name.lastIndexOf("/") + 1).slice(14)}"`,
    });

    res.send(url);
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/downloadFolder/:downloadPath', async (req: CustomRequest, res: Response) => {
  try {

    const downloadPath = req.params.downloadPath.replace(/\*/g, '/');
    const bucket = await storage.bucket(bucketName);
    const checkValid = downloadPath.substring(downloadPath.indexOf("/") + 1);
    if (!checkParamsValidity(checkValid)) {
      throw new Error('Invalid parameters');
    }
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      const reqRoot = downloadPath.substring(0, downloadPath.indexOf('/'));
      //
      if (userRoot !== reqRoot) {
        throw new Error('Unauthorized');
      }
      const [requestFiles] = await bucket.getFiles({ prefix: downloadPath });

      const thisState = await prisma.currentStateOnDelete.findUnique({
        where: {
          id: downloadPath,
        },
      });
      if (thisState) {
        throw new Error('You can not do this now!');
      }
      await prisma.$transaction(async (transaction) => {
        for (const dangerousFiles of requestFiles) {
          const anotherState = await prisma.currentStateOnDelete.findUnique({
            where: {
              id: dangerousFiles.name,
            },
          });
          if (anotherState) {
            throw new Error('You can not do this now!');
          }
        }
      });
      await prisma.$transaction(async (transaction) => {
        for (const requestFile of requestFiles) {
          let newState;
          const existingState = await prisma.currentState.findUnique({
            where: {
              id: requestFile.name,
            },
          });

          if (existingState) {
            newState = await prisma.currentState.update({
              where: {
                id: requestFile.name,
              },
              data: {
                nrRequests: existingState.nrRequests + 1,
              },
            });
          }
          else {
            newState = await prisma.currentState.create({
              data: {
                id: requestFile.name,
                userID: userRoot,
                state: 'downloading',
                nrRequests: 1,
              },
            });
          }
        }
      });
    }

    let archiveName: string = downloadPath.slice(0, downloadPath.lastIndexOf("/"));
    archiveName = archiveName.slice(archiveName.lastIndexOf("/") + 15);
    archiveName = Date.now() + '-' + archiveName;
    archiveName = `zip-${req.user?.uid}${req.user?.email}${archiveName}`;

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const output = fs.createWriteStream(`${archiveName}.zip`);


    output.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
    });
    output.on('end', function () {
      console.log('Data has been drained');
    });
    archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
        // log warning
        console.log(err.code)
      } else {
        // throw error
        throw err;
      }
    });
    archive.on('error', function (err) {
      throw err;
    });

    archive.pipe(output);

    async function archivation(googlePrefix: string, somePath: string) {
      const [files] = await bucket.getFiles({ prefix: googlePrefix });

      //stergem dir in care ne aflam
      let goodFiles = files.filter(item => item.name != googlePrefix);
      //luam toate directoarele de pe niv curent
      goodFiles = goodFiles.filter(item => item.name.replace(googlePrefix, "").indexOf("/") === item.name.replace(googlePrefix, "").lastIndexOf("/")
        && item.name.replace(googlePrefix, "").indexOf("/") != -1
        && item.name.charAt(item.name.length - 1) === "/");

      //cream directoarele de pe niv curent
      for (const file of goodFiles) {
        let dirName: string = file.name.slice(0, file.name.lastIndexOf("/"));
        dirName = dirName.slice(dirName.lastIndexOf("/") + 1).slice(14);
        archive.append("", { name: somePath.concat(dirName).concat("/") });
      }
      //cream fisierele de pe niv curent
      let [actualFiles] = await bucket.getFiles({ prefix: googlePrefix, delimiter: "/" });
      //stergem dir in care ne aflam
      actualFiles = actualFiles.filter(item => item.name != googlePrefix);
      for (const actualFile of actualFiles) {
        let fileName: string = actualFile.name.slice(actualFile.name.lastIndexOf("/") + 15);
        const stream = await actualFile.createReadStream();
        archive.append(stream, { name: somePath.concat(fileName) });
      }
      //recursie 
      for (const file of goodFiles) {
        let dirName: string = file.name.slice(0, file.name.lastIndexOf("/"));
        dirName = dirName.slice(dirName.lastIndexOf("/") + 1).slice(14);

        await archivation(file.name, somePath.concat(dirName).concat("/"))
      }
    }

    let initPath: string = downloadPath.slice(0, downloadPath.lastIndexOf("/"));
    initPath = initPath.slice(initPath.lastIndexOf("/") + 1).slice(14);
    archive.append("", { name: initPath.concat("/") });
    await archivation(downloadPath, initPath.concat("/"));
    async function uploadFile() {
      const options = {
        destination: archiveName + '.zip',
      };
      await bucket.upload(`${process.cwd()}/${archiveName}.zip`, options)
    }
    await archive.finalize().then(async () => {
      uploadFile().then(async () => {
        console.log(archiveName + '.zip');
        fs.unlink(`${process.cwd()}/${archiveName}.zip`, (err) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log('Archive file deleted from the server');
        });

        // const deletedState = await prisma.currentState.delete({
        //   where: {
        //     id: downloadPath,
        //   },
        // });

        const [requestFiles] = await bucket.getFiles({ prefix: downloadPath });
        await prisma.$transaction(async (transaction) => {
          for (const requestFile of requestFiles) {
            const existingState = await transaction.currentState.findUnique({
              where: {
                id: requestFile.name,
              },
            });
            if (existingState) {
              if (existingState.nrRequests === 1) {
                await transaction.currentState.delete({
                  where: {
                    id: requestFile.name,
                  },
                });
              }
              else {
                await transaction.currentState.update({
                  where: {
                    id: requestFile.name,
                  },
                  data: {
                    nrRequests: existingState.nrRequests - 1,
                  },
                });
              }
            }
          }
        });

        res.send(archiveName + '.zip');
      }).catch(console.error)
    });

  }
  catch (error) {
    console.error(error);
    if (typeof error === 'object' && error !== null) {
      const typedError = error as Error;

      if (typedError.message === 'You can not do this now!') {
        res.status(403).send('You can not do this now!');
      } else {
        res.status(500).send('Internal server error');
      }
    } else {
      res.status(500).send('Internal server error');
    }

  }
});

app.get('/downloadFolderURL/:downloadPath', async (req: CustomRequest, res: Response) => {
  try {
    const downloadPath = req.params.downloadPath.replace(/\*/g, '/');
    const bucket = await storage.bucket(bucketName);
    const file = await bucket.file(downloadPath);
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      const reqRoot = downloadPath.substring(4);

      if (!reqRoot.startsWith(userRoot)) {
        throw new Error('Unauthorized');
      }
    }
    async function checkFileExistence() {
      const [fileExists] = await file.exists();
      return fileExists;
    }

    const maxAttempts = 10; // Maximum number of attempts
    const delay = 1000; // Delay between attempts in milliseconds

    let attempts = 0;
    while (attempts < maxAttempts) {
      const fileExists = await checkFileExistence();
      if (fileExists) {
        break;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (attempts === maxAttempts) {
      throw new Error('File does not exist');
    }
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000,//24h
      responseDisposition: `attachment; filename="CloudStorage.zip"`,
    });
    res.send(url);
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/createFileURL/:downloadPath', async (req: CustomRequest, res: Response) => {
  try {

    const currPath = req.params.downloadPath.replace(/\*/g, '/');
    const bucket = await storage.bucket(bucketName);
    const file = await bucket.file(currPath);
    const checkValid = currPath.substring(currPath.indexOf("/") + 1);
    if (!checkParamsValidity(checkValid)) {
      throw new Error('Invalid parameters');
    }
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;
      const reqRoot = currPath.substring(0, currPath.indexOf('/'));

      if (userRoot !== reqRoot) {
        throw new Error('Unauthorized');
      }
    }
    const expiration = Date.now() + 24 * 60 * 60 * 1000;
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: expiration,//24h
      responseDisposition: `attachment; filename="${file.name.slice(file.name.lastIndexOf("/") + 1).slice(14)}"`,
    });



    const existingFile = await prisma.fileLink.findUnique({
      where: { id: file.name }
    });

    if (existingFile && req.user?.email && req.user?.uid) {
      const userId = req.user?.uid + req.user?.email;
      const updatedFile = await prisma.fileLink.update({
        where: { id: file.name },
        data: {
          userID: userId,
          filename: file.name.slice(file.name.lastIndexOf("/") + 1).slice(14), // Update other fields as needed
          downloadLink: url,
          validUntil: expiration.toString()
        }
      });
    }
    else {
      if (req.user?.email && req.user?.uid) {
        const userId = req.user?.uid + req.user?.email;
        const createdFile = await prisma.fileLink.create({
          data: {
            id: file.name,
            userID: userId,
            filename: file.name.slice(file.name.lastIndexOf("/") + 1).slice(14),
            downloadLink: url,
            validUntil: expiration.toString()
          }
        });
      }
    }
    res.send("Created Link");
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/createFolderURL/:downloadPath', async (req: CustomRequest, res: Response) => {
  try {

    const currPath = req.params.downloadPath.replace(/\*/g, '/');
    const bucket = await storage.bucket(bucketName);
    const file = await bucket.file(currPath);
    console.log(file.name);
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user.uid + req.user.email;

      if (!checkParamsValidity3(file.name, userRoot)) {
        throw new Error('Invalid parameters');
      }
    }
    const expiration = Date.now() + 24 * 60 * 60 * 1000;
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: expiration,//24h
      responseDisposition: `attachment; filename="CloudStorage.zip"`,
    });

    const existingFile = await prisma.fileLink.findUnique({
      where: { id: file.name }
    });
    if (existingFile) {
      if (req.user?.email && req.user?.uid) {
        const userId = req.user?.uid + req.user?.email;
        let fileName: string = file.name.replace(req.user.uid + req.user.email, "");
        console.log(fileName);
        fileName = fileName.substring(18);
        console.log(fileName);
        const updatedFile = await prisma.fileLink.update({
          where: { id: file.name },
          data: {
            userID: userId,
            filename: fileName, // Update other fields as needed
            downloadLink: url,
            validUntil: expiration.toString()
          }
        });
      }

    }
    else {
      if (req.user?.email && req.user?.uid) {
        const userId = req.user?.uid + req.user?.email;
        let fileName: string = file.name.replace(req.user.uid + req.user.email, "");
        console.log(fileName);
        fileName = fileName.substring(18);
        console.log(fileName);
        const createdFile = await prisma.fileLink.create({
          data: {
            userID: userId,
            id: file.name,
            filename: fileName,
            downloadLink: url,
            validUntil: expiration.toString()
          }
        });
      }
    }
    res.send("Created Link");
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/signedURLs/getter', async (req: CustomRequest, res: Response) => {

  try {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    };
    if (req.user?.email && req.user?.uid) {
      const userId = req.user?.uid + req.user?.email;

      await prisma.fileLink.deleteMany({
        where: {
          userID: userId,
          validUntil: {
            lt: (Date.now() - 24 * 60 * 60 * 1000).toString(),
          },
        },
      });

      const fileLinks = await prisma.fileLink.findMany({
        where: {
          userID: userId,
        }
      });

      const formattedFileLinks = fileLinks.map((link) => ({
        ...link,
        validUntil: new Date(parseInt(link.validUntil) + 24 * 60 * 60 * 1000).toLocaleString('en-US', options), // Add 24 hours to validUntil
      }));
      res.send(formattedFileLinks);

    }
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/search/files/:filename', async (req: CustomRequest, res: Response) => {
  try {
    if (req.user?.email && req.user?.uid) {
      const userRoot = req.user?.uid + req.user?.email + "/";
      const search = req.params.filename.slice(1);
      const lowerSearch = search.toLowerCase();
      const bucket = await storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: userRoot });

      const result = [];

      for (const file of files) {
        //daca e dosar
        if (file.name.lastIndexOf("/") === file.name.length - 1) {
          let dirName: string = file.name.substring(0, file.name.lastIndexOf("/"));
          dirName = dirName.substring(dirName.lastIndexOf("/") + 1);
          dirName = dirName.slice(14);
          const lowercaseDirName = dirName.toLowerCase();
          if (lowercaseDirName.includes(lowerSearch)) {
            result.push({
              id: file.name,
              name: dirName,
              isFile: false,
              fileType: "folder",
            });
          }
        }
        //daca e fisier
        else {
          let fileName: string = file.name.substring(file.name.lastIndexOf("/") + 15);
          const lowercaseFileName = fileName.toLowerCase();
          if (lowercaseFileName.includes(lowerSearch)) {
            result.push({
              id: file.name,
              name: fileName,
              isFile: true,
              fileType: file.metadata.contentType ? file.metadata.contentType : null,
            });
          }
        }
      }

      res.send(result);


    }
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get('/does/file/:filename', async (req: CustomRequest, res: Response) => {
  try {
    const filename = req.params.filename.replace(/\*/g, '/');
    const bucket = await storage.bucket(bucketName);
    const file = bucket.file(filename);
    const [exists] = await file.exists();
    const thisState = await prisma.currentStateOnDelete.findUnique({
      where: {
        id: filename,
      },
    });
    if (thisState) {
      throw new Error('You can not do this now!');
    }
    if (exists && !thisState) {
      res.send("good");
    }
    else {
      res.send("bad");
    }

  }
  catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});




