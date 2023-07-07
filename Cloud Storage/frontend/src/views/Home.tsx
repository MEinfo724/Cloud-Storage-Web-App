import React from 'react';
import { AiFillCloud } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';

import { Button, Flex, Text } from '@chakra-ui/react';

export const Home = () => {
  const navigate = useNavigate();
  return (
    <Flex gap="20px" direction="column" w="full" h="100vh" align="center" justify="center">
      <AiFillCloud size="80px" />

      <Text>Welcome to CloudStorage</Text>

      <Text>Log in with your CloudStorage account to continue</Text>

      <Flex gap="10px">
        <Button colorScheme="blue" onClick={() => navigate('/login')}>
          Log In
        </Button>

        <Button colorScheme="blue" onClick={() => navigate('/signup')}>
          Sign Up
        </Button>
      </Flex>
    </Flex>
  );
};
