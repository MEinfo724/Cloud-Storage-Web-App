import React from 'react';
import { AiFillFolder, AiOutlineDownload, AiOutlineEye, AiOutlineFileText } from 'react-icons/ai';
import { AiFillFileExcel, AiFillFilePdf, AiOutlineLink } from 'react-icons/ai';
import { BsFillTrashFill } from 'react-icons/bs';
import { FaFileArchive, FaFilePowerpoint } from 'react-icons/fa';
import { IoMdOptions } from 'react-icons/io';
import { MdHeadphones, MdInsertPhoto } from 'react-icons/md';
import { TfiVideoClapper } from 'react-icons/tfi';

import {
  Card,
  CardBody,
  Divider,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { auth } from '../../firebase';
import { FileType } from '../../views/entities';
interface DocumentCardProps {
  data: FileType; // Use the FileType type for the data prop
  onClick: () => void;
  onClickMenu: () => void;
}
const options = [
  { text: 'Preview', icon: <AiOutlineEye /> },
  { text: 'Download Link', icon: <AiOutlineLink /> },
  { text: 'Download', icon: <AiOutlineDownload /> },
  { text: 'Delete', icon: <BsFillTrashFill /> },
];
function getIcon(fileType: string) {
  switch (fileType) {
    case 'application/pdf':
      return <AiFillFilePdf />;
    case 'application/x-7z-compressed':
      return <FaFileArchive />;
    case 'application/zip':
      return <FaFileArchive />;
    case 'image/jpeg':
      return <MdInsertPhoto />;
    case 'image/png':
      return <MdInsertPhoto />;
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return <FaFilePowerpoint />;
    case 'text/csv':
      return <AiFillFileExcel />;
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return <AiFillFileExcel />;
    case 'video/mp4':
      return <TfiVideoClapper />;
    case 'audio/wav':
      return <MdHeadphones />;
    case 'audio/mpeg':
      return <MdHeadphones />;
    case 'folder':
      return <AiFillFolder />;
    default:
      return <AiOutlineFileText />;
  }
}
function getColor(fileType: string) {
  switch (fileType) {
    case 'application/pdf':
      return '#D93025';
    case 'application/x-7z-compressed':
      return '#5F6368';
    case 'application/zip':
      return '#5F6368';
    case 'image/jpeg':
      return '#D93025';
    case 'image/png':
      return '#D93025';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return '#F4B400';
    case 'text/csv':
      return '#0F9D58';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '#0F9D58';
    case 'video/mp4':
      return '#D93025';
    case 'audio/wav':
      return '#D93025';
    case 'audio/mpeg':
      return '#D93025';
    case 'folder':
      return '#5F6368';
    default:
      return '#4299E1';
  }
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ data, onClick, onClickMenu }) => {
  const toast = useToast();
  const fileName = data.name.length > 14 ? data.name.slice(0, 11) + '...' : data.name;
  const Icon = getIcon(data.fileType).type;
  const Color = getColor(data.fileType);
  const handleDownload = async () => {
    if (data.isFile == true) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await axios.get(`/downloadFile/${data.id.replace(/\//g, '*')}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        const downloadUrl = response.data;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank'; // Open the link in a new tab
        link.rel = 'noopener noreferrer';
        link.click();
      } catch (error) {
        console.error(error);
      }
    } else {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await axios.post(`/downloadFolder/${data.id.replace(/\//g, '*')}`, null, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        console.log('ArchiveName', response.data);
        if (response.data) {
          const res = await axios.get(`/downloadFolderURL/${response.data.replace(/\//g, '*')}`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          const downloadUrl = res.data;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.target = '_blank'; // Open the link in a new tab
          link.rel = 'noopener noreferrer';
          link.click();
        }
      } catch (error) {
        console.error('An error occurred during folder download:', error);
        const typedError = error as any; // Use type assertion to handle as any type

        if (typedError.response && typedError.response.status === 403) {
          toast({
            title: 'You can not do this now!',
            status: 'error',
            isClosable: true,
            duration: 4000,
          });
        }
      }
    }
  };
  const queryClient = useQueryClient();
  const createFileLink = useMutation({
    mutationFn: async (path: string) => {
      const idToken = await auth.currentUser?.getIdToken();
      return axios.post(`/createFileURL/${path}`, null, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['getLinks']);
      console.log(res.data);
    },
  });
  const createFolderLink = useMutation({
    mutationFn: async (path: string) => {
      const idToken = await auth.currentUser?.getIdToken();
      return axios.post(`/createFolderURL/${path}`, null, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    },
    onSuccess: (res) => {
      console.log(res.data);
      queryClient.invalidateQueries(['getLinks']);
    },
  });
  const handleDownloadLink = async () => {
    if (data.isFile == true) {
      createFileLink.mutate(data.id.replace(/\//g, '*'));
    } else {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await axios.post(`/downloadFolder/${data.id.replace(/\//g, '*')}`, null, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        console.log(response.data);
        if (response.data) {
          createFolderLink.mutate(response.data.replace(/\//g, '*'));
        }
      } catch (error) {
        console.error('An error occurred during folder download:', error);
        const typedError = error as any; // Use type assertion to handle as any type

        if (typedError.response && typedError.response.status === 403) {
          toast({
            title: 'You can not do this now!',
            status: 'error',
            isClosable: true,
            duration: 4000,
          });
        }
      }
    }
  };
  const deleteFolderMutation = useMutation({
    mutationFn: async (path: string) => {
      const idToken = await auth.currentUser?.getIdToken();
      return axios.delete(`${path}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['getFiles']);
      queryClient.invalidateQueries(['getLinks']);
      console.log(res.data);
    },
    onError: (error) => {
      console.error('An error occurred during folder deletion:', error);
      const typedError = error as any; // Use type assertion to handle as any type

      if (typedError.response && typedError.response.status === 403) {
        toast({
          title: 'You can not do this now!',
          status: 'error',
          isClosable: true,
          duration: 4000,
        });
      }
    },
  });
  const handleDelete = async () => {
    deleteFolderMutation.mutate(data.id.replace(/\//g, '*'));
  };

  const handlePreview = async () => {
    if (data.isFile) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await axios.get(`/downloadFile/${data.id.replace(/\//g, '*')}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (response.data) {
          const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
            response.data
          )}&embedded=true`;
          const openPreviewInNewTab = () => {
            window.open(viewerUrl, '_blank');
          };
          openPreviewInNewTab();
        }
      } catch (error) {
        console.log(error);
      }
    }
  };
  function optionCalled(opt: string) {
    console.log(opt);
    switch (opt) {
      case 'Preview':
        handlePreview();
        break;
      case 'Download Link':
        handleDownloadLink();
        break;
      case 'Download':
        handleDownload();
        break;
      case 'Delete':
        handleDelete();
        break;
      default:
        return;
    }
  }
  return (
    <Menu>
      <Card
        h="140px"
        w="150px"
        direction="column"
        align="center"
        onClick={() => onClick()}
        cursor="pointer"
      >
        <CardBody>
          <Icon size="70px" color={Color} />
          <MenuButton
            variant="ghost"
            as={IconButton}
            icon={<IoMdOptions />}
            position="absolute"
            top="5px"
            right="5px"
            onClick={(event) => {
              event.stopPropagation();
              onClickMenu();
            }}
          ></MenuButton>
        </CardBody>
        <Divider />

        <Text>{fileName}</Text>
      </Card>

      <MenuList>
        {options.map((option, optionIndex) => {
          if (option.text === 'Preview' && !data.isFile) {
            return null; // Skip rendering the "Preview" option
          }
          return (
            <MenuItem key={optionIndex} onClick={() => optionCalled(option.text)}>
              <Flex direction="row" align="center" gap="10px">
                {option.icon}
                {option.text}
              </Flex>
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
};
