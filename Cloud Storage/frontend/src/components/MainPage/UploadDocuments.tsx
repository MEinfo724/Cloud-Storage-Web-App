import React, { useEffect, useRef, useState } from 'react';
import { AiFillFolderAdd } from 'react-icons/ai';
import { BsPlusCircleFill } from 'react-icons/bs';
import { MdDriveFolderUpload, MdUploadFile } from 'react-icons/md';

import {
  Box,
  Button,
  Flex,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { auth } from '../../firebase';
interface UploadDocumentsProps {
  currPath: string;
}
declare global {
  interface Window {
    showDirectoryPicker: () => Promise<any>;
  }
}
export const UploadDocuments: React.FC<UploadDocumentsProps> = ({ currPath }) => {
  const toast = useToast();
  const [numberOfFiles, setNumberOfFiles] = useState<string>('No files chosen.');
  const [createFolder, setCreateFolder] = useState<string>('');
  const {
    isOpen: isUploadFilesModal,
    onOpen: openUploadFilesModal,
    onClose: closeUploadFilesModal,
  } = useDisclosure();
  const newUploadFilesModalInitialRef = React.useRef(null);
  const newUploadFilesModalFinalRef = React.useRef(null);

  const {
    isOpen: isCreateFolderModal,
    onOpen: openCreateFolderModal,
    onClose: closeCreateFolderModal,
  } = useDisclosure();
  const newCreateFolderModalInitialRef = React.useRef(null);
  const newCreateFolderModalFinalRef = React.useRef(null);

  const queryClient = useQueryClient();

  //<------------------------------------------------------------UPLOAD FILES------------------------------------------------------------> BEGIN
  interface PostParameters {
    myFile: File;
    path: string;
  }
  const newPostMutation = useMutation({
    mutationFn: async ({ myFile, path }: PostParameters) => {
      const idToken = await auth.currentUser?.getIdToken();
      return axios.post(`${path}${Date.now()}-${myFile.name}`, myFile, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['getFiles']);
      console.log(res.data);
    },
  });
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const currentPath = currPath;
    let nrFiles: number = 0;
    if (event.dataTransfer.items) {
      Array.from(event.dataTransfer.items).forEach((item, i) => {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry?.isFile) {
            nrFiles++;
          }
        }
      });
    }
    if (nrFiles === 1) {
      setNumberOfFiles('One file chosen');
    } else if (nrFiles > 1) {
      setNumberOfFiles(`${nrFiles} files chosen.`);
    }
    const maxSize = 10 * 1024 * 1024;
    let ok: number = 1;
    if (event.dataTransfer.items) {
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        (async () => {
          const item = event.dataTransfer.items[i];
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry();
            if (entry?.isFile) {
              const someFile = item.getAsFile();

              if (someFile) {
                if (someFile.size <= maxSize) {
                  newPostMutation.mutate({ myFile: someFile, path: currentPath });
                } else {
                  ok = 0;
                }
              }
            }
          }
        })().catch((error) => console.log(error));
      }
    }
    if (ok === 1) {
      toast({
        title: 'Files are being uploaded!',
        status: 'success',
        isClosable: true,
        duration: 1000,
      });
    } else {
      toast({
        title: 'Only files under 10MB are being uploaded!',
        status: 'error',
        isClosable: true,
        duration: 2000,
      });
    }

    closeUploadFilesModal();
  };
  //<------------------------------------------------------------UPLOAD FILES------------------------------------------------------------> END
  //<------------------------------------------------------------CREATE FOLDER------------------------------------------------------------> BEGIN
  const newPostFolderMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const idToken = await auth.currentUser?.getIdToken();

      return axios.post(`${filePath}`, null, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['getFiles']);
      console.log(res.data);
    },
  });
  const handleCreation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/[/\\:*?"<>|]/.test(createFolder) && createFolder.length != 0) {
      const postFolderPath = currPath
        .concat(Date.now().toString())
        .concat('-')
        .concat(createFolder)
        .concat('*');
      newPostFolderMutation.mutate(postFolderPath);
    } else {
      toast({
        title: 'Invalid folder name.',
        status: 'error',
        isClosable: true,
        duration: 1500,
      });
    }
    setCreateFolder('');
    event.currentTarget.reset();
    closeCreateFolderModal();
  };
  //<------------------------------------------------------------CREATE FOLDER------------------------------------------------------------> END
  //<------------------------------------------------------------UPLOAD FOLDER------------------------------------------------------------> BEGIN
  const buttonRef = useRef<HTMLButtonElement>(null);
  interface MyPaths {
    oldPath: string;
    newPath: string;
    directoryName: string;
  }
  const newPutMutation = useMutation({
    mutationFn: async ({ oldPath, newPath, directoryName }: MyPaths) => {
      const idToken = await auth.currentUser?.getIdToken();
      return axios.put(
        '/uploadFolder/finalize',
        { oldPath, newPath, directoryName },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['getFiles']);
      console.log(res.data);
    },
  });
  useEffect(() => {
    const handleClick = async () => {
      async function listEntries(directory: any, path: string, token: string | undefined) {
        const axiosConfig = {
          headers: {
            Authorization: `Bearer ${token}`, // Include the authorization token in the request headers
          },
        };
        for await (const entry of directory.values()) {
          if (entry.kind === 'file') {
            const fileHandle = await directory.getFileHandle(entry.name);
            const fileContents = await fileHandle.getFile();
            if (fileContents.size < 10 * 1024 * 1024) {
              await axios.post(
                `/uploadFolder/${path + Date.now() + '-' + entry.name}`,
                fileContents,
                axiosConfig
              );
            }
          }
        }
        for await (const entry of directory.values()) {
          if (entry.kind === 'directory') {
            const tmpCode = Date.now();
            axios.post(`/uploadFolder/${path + tmpCode + '-' + entry.name}*`, null, axiosConfig);
            await listEntries(
              await directory.getDirectoryHandle(entry.name),
              path + tmpCode + '-' + entry.name + '*',
              token
            );
          }
        }
      }
      try {
        //tinem minte pathu de upload
        const uid = auth.currentUser?.uid;
        const email = auth.currentUser?.email;
        const idToken = await auth.currentUser?.getIdToken();
        const uploadPath = currPath;
        const directoryHandle = await window.showDirectoryPicker();
        //creez un path temp de upload ce nu poate fi accesat de user
        const tempPath = `tmp-${Date.now()}-${uid}${email}-${directoryHandle.name}*`;
        toast({
          title: 'Folder is being uploaded!',
          status: 'success',
          isClosable: true,
          duration: 1000,
        });
        await listEntries(directoryHandle, tempPath, idToken).then(async () => {
          newPutMutation.mutate({
            oldPath: tempPath,
            newPath: uploadPath,
            directoryName: directoryHandle.name,
          });
        });
        //aici urmeaza un alt post request in care mutam folderul dummy unde trebuie
      } catch (error) {
        console.log(error);
      }
    };

    if (buttonRef.current) {
      buttonRef.current.addEventListener('click', handleClick);
    }

    return () => {
      if (buttonRef.current) {
        buttonRef.current.removeEventListener('click', handleClick);
      }
    };
  }, [currPath]);
  //<------------------------------------------------------------UPLOAD FOLDER------------------------------------------------------------> END
  useEffect(() => {
    setNumberOfFiles('No files chosen.');
  }, [isUploadFilesModal]);
  return (
    <Menu>
      <MenuButton as={Button} bg="white">
        <BsPlusCircleFill size="20px" />
      </MenuButton>
      <MenuList>
        {/* <------------------------------------------------------------CREATE FOLDER------------------------------------------------------------> BEGIN */}
        <MenuItem onClick={openCreateFolderModal}>
          <Flex direction="row" align="center" gap="10px">
            <AiFillFolderAdd color="#4299E1" />
            <Text>New Folder</Text>
          </Flex>
          <Modal
            initialFocusRef={newCreateFolderModalInitialRef}
            finalFocusRef={newCreateFolderModalFinalRef}
            isOpen={isCreateFolderModal}
            onClose={closeCreateFolderModal}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalBody pb={6}>
                <form onSubmit={handleCreation}>
                  <Input
                    type="text"
                    mt={4}
                    placeholder="Create folder"
                    onChange={(e) => setCreateFolder(e.target.value)}
                  ></Input>
                  <Button type="submit" mt={4} colorScheme="blue">
                    Create
                  </Button>
                </form>
              </ModalBody>
            </ModalContent>
          </Modal>
        </MenuItem>
        {/* <------------------------------------------------------------CREATE FOLDER------------------------------------------------------------> END */}
        {/* <------------------------------------------------------------UPLOAD FILES------------------------------------------------------------> BEGIN */}
        <MenuItem onClick={openUploadFilesModal}>
          <Flex direction="row" align="center" gap="10px">
            <MdUploadFile color="#4299E1" />
            <Text>Upload files</Text>
          </Flex>
          <Modal
            initialFocusRef={newUploadFilesModalInitialRef}
            finalFocusRef={newUploadFilesModalFinalRef}
            isOpen={isUploadFilesModal}
            onClose={closeUploadFilesModal}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalBody pb={6}>
                <form>
                  <Flex direction="column" justify="center" alignItems="center">
                    <Box
                      h="100px"
                      w="360px"
                      bg="#4299E1"
                      borderRadius="md"
                      mt={4}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <Flex direction="column" justify="center" alignItems="center">
                        <Text as="b" mt={6}>
                          Drag and drop files!
                        </Text>
                        <Text>{numberOfFiles}</Text>
                      </Flex>
                    </Box>
                  </Flex>
                </form>
              </ModalBody>
            </ModalContent>
          </Modal>
        </MenuItem>
        {/* <------------------------------------------------------------UPLOAD FILES------------------------------------------------------------> END */}
        {/* <------------------------------------------------------------UPLOAD FOLDER-----------------------------------------------------------> BEGIN */}
        <MenuItem ref={buttonRef}>
          <Flex direction="row" align="center" gap="10px">
            <MdDriveFolderUpload color="#4299E1" />
            <Text>Upload a folder</Text>
          </Flex>
        </MenuItem>
        {/* <------------------------------------------------------------UPLOAD FOLDER-----------------------------------------------------------> END */}
      </MenuList>
    </Menu>
  );
};
