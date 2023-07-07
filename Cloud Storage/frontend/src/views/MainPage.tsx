import React, { useEffect, useState } from 'react';
import { AiOutlineArrowRight, AiOutlinePaperClip } from 'react-icons/ai';
import { GoFileDirectory } from 'react-icons/go';
import { IoIosArrowBack } from 'react-icons/io';
import { MdShare } from 'react-icons/md';
import { Navigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Divider,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAtom } from 'jotai';

import { DocumentCard, Header, UploadDocuments } from '../components/MainPage';
import { auth } from '../firebase';
import { searchResultsDataAtom, userDataAtom } from '../hooks';

import { FileType } from './entities';
import { UserLink } from './entities';
export const MainPage = () => {
  //<------------------------------------------------------------LOGICA DE VERIFICARE A SESIUNII SI INITIALIZARI------------------------------------------------------------> BEGIN
  const [currentPath, setCurrentPath] = useState<string>('');
  const [displayedPath, setDisplayedPath] = useState<string>('');
  const [showPage, setShowPage] = useState<number>(0);
  const [searchCond, setSearchCond] = useState<number>(0);
  const toast = useToast();
  const [userData, setUserData] = useAtom(userDataAtom);
  const [showComponent, setShowComponent] = useState(false);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowComponent(true);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, []);

  function expiredSession() {
    if (auth.currentUser) {
      const dateString = auth.currentUser.metadata.lastSignInTime;
      const lastLogin = new Date(String(dateString)).getTime() / 1000;
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      if (currentTimeInSeconds - lastLogin > 3600) {
        return true;
      } else {
        const uid = auth.currentUser.uid;
        const email = auth.currentUser.email;
        const userRoot = uid + email + '*';

        if (currentPath == '') {
          setCurrentPath(userRoot);
          setDisplayedPath('Home/');
        }
        return false;
      }
    }
  }
  //<------------------------------------------------------------LOGICA DE VERIFICARE A SESIUNII SI INITIALIZARI------------------------------------------------------------> END
  //<------------------------------------------------------------GETTING FILES------------------------------------------------------------> BEGIN
  const queryClient = useQueryClient();
  //GETTING FILES
  const getData = async (path: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (path === '-1') {
      return [];
    } else {
      const { data } = await axios.get<FileType[]>(path, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      return data;
    }
  };
  const { data: files } = useQuery({
    queryKey: ['getFiles', currentPath],
    queryFn: () => {
      if (currentPath != '' && currentPath != null) {
        return getData(currentPath);
      } else return getData('-1');
    },
  });

  const getDataLinks = async (path: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (path === '-1') {
      return [];
    } else {
      const { data } = await axios.get<UserLink[]>('/signedURLs/getter', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      return data;
    }
  };
  const { data: downldLinks } = useQuery({
    queryKey: ['getLinks', currentPath],
    queryFn: () => {
      if (currentPath != '' && currentPath != null) {
        return getDataLinks(currentPath);
      } else return getDataLinks('-1');
    },
  });
  useEffect(() => {
    const currentPathLength = currentPath.split('*').length;
    const displayedPathLength = displayedPath.split('/').length;
    if (currentPathLength === 2) {
      setDisplayedPath('Home/');
    } else if (searchCond === 1) {
      //
      console.log('In Search Cond IF BLOCK');
      const dirs = currentPath.split('*');
      let auxPath: string = 'Home/';

      for (let i = 1; i < dirs.length - 1; i++) {
        let auxFolder: string = dirs[i].slice(14);
        auxFolder = auxFolder.length > 14 ? auxFolder.slice(0, 11) + '...' : auxFolder;
        auxPath = auxPath + auxFolder + '/';
      }
      setDisplayedPath(auxPath);
      setSearchCond(0);
    } else {
      if (currentPathLength > displayedPathLength) {
        //trebuie sa adaug la displayed path directoare
        const dirs = currentPath.split('*');
        let penultimateDir: string = dirs[dirs.length - 2];
        penultimateDir = penultimateDir.slice(14);
        penultimateDir =
          penultimateDir.length > 14 ? penultimateDir.slice(0, 11) + '...' : penultimateDir;
        setDisplayedPath(displayedPath + penultimateDir + '/');
      } else if (currentPathLength < displayedPathLength) {
        //
        let displayPath: string = displayedPath;
        displayPath = displayPath.substring(0, displayPath.length - 1);
        displayPath = displayPath.substring(0, displayPath.lastIndexOf('/') + 1);

        setDisplayedPath(displayPath);
      }
    }
  }, [currentPath]);
  //<------------------------------------------------------------GETTING FILES------------------------------------------------------------> END
  //<------------------------------------------------------------GETTING FILES IN A CERTAIN DIR------------------------------------------------------------> BEGIN
  const getDirFiles = async (dirName: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    const results = await axios.get(`/does/file/${dirName.replace(/\//g, '*')}`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (results.data === 'good') {
      dirName = dirName.replace(/\//g, '*');
      setCurrentPath(dirName);
      // queryClient.invalidateQueries(['getFiles']);
      queryClient.clear();
    } else {
      toast({
        title: 'Can not do this now!',
        status: 'error',
        isClosable: true,
        duration: 1000,
      });
    }
  };
  const goBack = () => {
    if (currentPath.indexOf('*') != currentPath.lastIndexOf('*')) {
      let oldPath: string = currentPath.slice(0, -1);
      oldPath = oldPath.slice(0, oldPath.lastIndexOf('*') + 1);
      setCurrentPath(oldPath);
      queryClient.clear();
    } else {
      console.log("Can't go back");
    }
  };
  //<------------------------------------------------------------GETTING FILES IN A CERTAIN DIR------------------------------------------------------------> END
  const handleButtonClick = (buttonIndex: any) => {
    setShowPage(buttonIndex);
  };
  const buttons = [
    { text: 'My documents', icon: <GoFileDirectory /> },
    { text: 'Download links', icon: <MdShare /> },
  ];
  const buttonStyle = {
    colorScheme: 'blue',
    gap: '10px',
    w: '165px',
    variant: 'ghost',
    direction: 'row',
    justifyContent: 'flex-start',
    borderRadius: '24px',
    size: 'sm',
  };
  const [_copiedLink, setCopiedLink] = useState<string>('');

  const copyToClipboard = async (downloadLink: string) => {
    try {
      await navigator.clipboard.writeText(downloadLink);
      setCopiedLink(downloadLink);
      toast({
        title: 'Copied download link to clipboard!',
        status: 'success',
        isClosable: true,
        duration: 1500,
      });
    } catch (error) {
      console.error('Failed to copy link to clipboard:', error);
    }
  };

  const [searchResults, setSearchResults] = useAtom(searchResultsDataAtom);
  const isOpen = searchResults !== null;
  const goTo = async (goToPath: string) => {
    console.log(goToPath);
    if (goToPath.lastIndexOf('/') === goToPath.length - 1) {
      console.log('this a folder');
      goToPath = goToPath.replace(/\//g, '*');
      setSearchResults(null);
      setSearchCond(1);
      setCurrentPath(goToPath);
      queryClient.clear();
    } else {
      console.log('this a file');
      goToPath = goToPath.substring(0, goToPath.lastIndexOf('/') + 1);
      goToPath = goToPath.replace(/\//g, '*');
      setSearchResults(null);
      setSearchCond(1);
      setCurrentPath(goToPath);
      queryClient.clear();
    }
  };

  if (!showComponent) {
    //loading animation
    return (
      <Center w="full" minH="95vh">
        <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="teal.500" size="xl" />
      </Center>
    );
  } else if (userData === null || expiredSession()) {
    auth.signOut();
    setUserData(null);
    return <Navigate to="/login" />;
  } else {
    return (
      <Flex bg="#f7f9fc" minHeight="100vh" direction="column">
        <Header />
        <Flex flex="1">
          <Flex gap="5px" direction="column" align="left" paddingLeft="30px" paddingRight="30px">
            {buttons.map((button, index) => {
              return (
                <Button
                  key={index}
                  {...buttonStyle}
                  isActive={showPage === index ? true : false}
                  onClick={() => handleButtonClick(index)}
                >
                  {button.icon}
                  {button.text}
                </Button>
              );
            })}
          </Flex>
          <Modal isOpen={isOpen} onClose={() => setSearchResults(null)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Search Results</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>File name</Th>

                      <Th>Go To</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {searchResults &&
                      searchResults?.map((thisResult, index) => {
                        return (
                          <Tr key={index}>
                            <Td>
                              {thisResult.name.length > 20
                                ? thisResult.name.slice(0, 17) + '...'
                                : thisResult.name}
                            </Td>

                            <Td>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  goTo(thisResult.id);
                                }}
                              >
                                <AiOutlineArrowRight />
                              </Button>
                            </Td>
                          </Tr>
                        );
                      })}
                  </Tbody>
                </Table>
              </ModalBody>
            </ModalContent>
          </Modal>
          {showPage === 0 && (
            <Card w="full" h="80vh" marginRight="30px">
              <CardHeader>
                <Flex align="center" gap="5px">
                  <UploadDocuments currPath={currentPath} />
                  <Button bg="white" onClick={() => goBack()}>
                    <IoIosArrowBack />
                  </Button>

                  <Text fontSize="lg">
                    {displayedPath.length > 20
                      ? `...${displayedPath.slice(displayedPath.length - 20, displayedPath.length)}`
                      : displayedPath}
                  </Text>
                </Flex>
              </CardHeader>
              <Divider color="gray.400"></Divider>
              <CardBody overflowY="auto">
                <Flex wrap="wrap" gap="10px" rowGap="30px">
                  {files &&
                    files?.map((file, index) => {
                      if (file.id != null) {
                        return (
                          <DocumentCard
                            key={index}
                            data={file}
                            onClick={file.isFile ? () => {} : () => getDirFiles(file.id)}
                            onClickMenu={() => {}}
                          />
                        );
                      }
                    })}
                </Flex>
              </CardBody>
            </Card>
          )}
          {showPage === 1 && (
            <Card w="full" h="80vh" marginRight="30px">
              <CardBody overflowY="auto">
                {/* <Flex direction="column" align="center" justify="space-between" gap="20px"> */}
                <Table>
                  <Thead>
                    <Tr>
                      <Th>File name</Th>
                      <Th>Expiration date</Th>
                      <Th>Link</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {downldLinks &&
                      downldLinks?.map((link, index) => {
                        return (
                          <Tr key={index}>
                            <Td>
                              {link.filename.length > 26
                                ? `${link.filename.slice(0, 23)}...`
                                : link.filename}
                            </Td>
                            <Td>{link.validUntil}</Td>
                            <Td>
                              <Button
                                variant="ghost"
                                onClick={() => copyToClipboard(link.downloadLink)}
                              >
                                <AiOutlinePaperClip />
                              </Button>
                            </Td>
                          </Tr>
                        );
                      })}
                  </Tbody>
                </Table>
                {/* </Flex> */}
              </CardBody>
            </Card>
          )}
        </Flex>
      </Flex>
    );
  }
};
