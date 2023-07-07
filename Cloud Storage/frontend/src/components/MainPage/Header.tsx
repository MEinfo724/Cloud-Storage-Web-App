import React, { useState } from 'react';
import { AiFillCloud, AiOutlineSearch } from 'react-icons/ai';
import { GoSignOut } from 'react-icons/go';
import { Navigate } from 'react-router-dom';

import { Button, Input, InputGroup, useToast } from '@chakra-ui/react';
import axios from 'axios';
import { useAtom } from 'jotai';

import { auth } from '../../../src/firebase';
import { searchResultsDataAtom, userDataAtom } from '../../hooks';
import { FileType } from '../../views/entities';

import { HeaderContainer } from './Header.layout';

export const Header = () => {
  const toast = useToast();
  const [_userData, setUserData] = useAtom(userDataAtom);
  const handleSignOut = () => {
    auth.signOut();
    setUserData(null);
    return <Navigate to="/login" />;
  };
  const [searchField, setSearchField] = useState<string>('');
  const [_searchResults, setSearchResults] = useAtom(searchResultsDataAtom);
  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!/[/\\:*?"<>|]/.test(searchField) && searchField.length != 0) {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await axios.get<FileType[]>(`/search/files/:${searchField}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        setSearchResults(response.data);
      } else {
        toast({
          title: 'Invalid search',
          status: 'error',
          isClosable: true,
          duration: 1500,
        });
      }
    } catch (error) {
      console.log(error);
    }

    setSearchField('');
  };
  return (
    <HeaderContainer>
      <AiFillCloud size="60px" cursor="pointer" onClick={() => window.location.reload()} />
      <form onSubmit={handleSearch}>
        <InputGroup w="600px" size="lg">
          <Button
            borderRightRadius="0px"
            // as={InputLeftAddon}
            _hover={{
              color: '#4299E1',
            }}
            cursor="pointer"
            type="submit"
          >
            <AiOutlineSearch />
          </Button>

          <Input
            borderLeftRadius="0px"
            type="text"
            placeholder="Search a file"
            variant="filled"
            bg="white"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          />
        </InputGroup>
      </form>

      <GoSignOut size="40px" cursor="pointer" onClick={handleSignOut} />
    </HeaderContainer>
  );
};
