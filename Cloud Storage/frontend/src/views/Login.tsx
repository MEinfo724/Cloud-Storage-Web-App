import React, { useState } from 'react';
import { AiFillCloud } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';

import { Button, Flex, FormControl, Grid, Input, Text, useToast } from '@chakra-ui/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAtom } from 'jotai';

import { auth } from '../firebase';
import { userDataAtom } from '../hooks';
export const Login = () => {
  const toast = useToast();
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [selectedPassword, setSelectedPassword] = useState<string>('');
  const navigate = useNavigate();
  const [_userData, setUserData] = useAtom(userDataAtom);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    signInWithEmailAndPassword(auth, selectedEmail, selectedPassword)
      .then((userCredential) => {
        toast({
          title: 'You have successfully logged in!',
          status: 'success',
          isClosable: true,
          duration: 1500,
        });

        setUserData(userCredential);
        navigate('/mainpage');
      })
      .catch((error: any) => {
        if (error.code === 'auth/invalid-email') {
          toast({
            title: 'Invalid email.',
            status: 'error',
            isClosable: true,
            duration: 4000,
          });
        } else if (error.code === 'auth/user-not-found') {
          toast({
            title: 'User not found',
            status: 'error',
            isClosable: true,
            duration: 4000,
          });
        } else if (error.code === 'auth/wrong-password') {
          toast({
            title: 'Wrong password.',
            status: 'error',
            isClosable: true,
            duration: 4000,
          });
        } else {
          console.error(error);
        }
      });

    setSelectedEmail('');
    setSelectedPassword('');
  };

  return (
    <Flex gap="20px" direction="column" w="full" h="100vh" align="center" justify="center">
      <AiFillCloud size="80px" />

      <Text as="b" fontSize="4xl">
        Welcome back
      </Text>

      <form onSubmit={handleSubmit}>
        <Grid templateColumns="1fr" gap="20px" w="350px">
          <FormControl>
            <Input
              type="email"
              placeholder="Email adress"
              value={selectedEmail}
              required={true}
              onChange={(e) => setSelectedEmail(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <Input
              type="password"
              placeholder="Password"
              value={selectedPassword}
              required={true}
              onChange={(e) => setSelectedPassword(e.target.value)}
            />
          </FormControl>

          <Button colorScheme="blue" type="submit">
            Continue
          </Button>
        </Grid>
      </form>

      <Text>
        Don&apos;t have an account?{' '}
        <Text color="#4299E1" as="span" onClick={() => navigate('/signup')} cursor="pointer">
          Sign up
        </Text>
      </Text>
    </Flex>
  );
};
