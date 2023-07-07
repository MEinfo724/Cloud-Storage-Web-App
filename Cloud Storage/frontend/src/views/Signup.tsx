import React, { useState } from 'react';
import { AiFillCloud } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';

import { Button, Flex, FormControl, Grid, Input, Text, useToast } from '@chakra-ui/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAtom } from 'jotai';

import { auth } from '../firebase';
import { userDataAtom } from '../hooks';
export const Signup = () => {
  const toast = useToast();

  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [selectedPassword, setSelectedPassword] = useState<string>('');
  const [_userData, setUserData] = useAtom(userDataAtom);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // !/[/\\:*?"<>|`;]/.test(createFolder)
    if (!/[/\\:*?"<>|]/.test(selectedEmail)) {
      createUserWithEmailAndPassword(auth, selectedEmail, selectedPassword)
        .then((userCredential) => {
          toast({
            title: 'You have successfully created an account!',
            status: 'success',
            isClosable: true,
            duration: 1500,
          });
          setUserData(userCredential);
          navigate('/mainpage');
        })
        .catch((error: any) => {
          if (error.code === 'auth/email-already-in-use') {
            toast({
              title: 'Email address already in use.',
              status: 'error',
              isClosable: true,
              duration: 4000,
            });
          } else if (error.code === 'auth/invalid-email') {
            toast({
              title: 'Invalid email address.',
              status: 'error',
              isClosable: true,
              duration: 4000,
            });
          } else if (error.code === 'auth/weak-password') {
            toast({
              title: 'Password is too weak.',
              status: 'error',
              isClosable: true,
              duration: 4000,
            });
          } else {
            console.error(error);
          }
        });
    } else {
      toast({
        title: 'Invalid email address.',
        status: 'error',
        isClosable: true,
        duration: 4000,
      });
    }

    setSelectedEmail('');
    setSelectedPassword('');
  };
  return (
    <Flex gap="20px" direction="column" w="full" h="100vh" align="center" justify="center">
      <AiFillCloud size="80px" />

      <Text as="b" fontSize="4xl">
        Create your account
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
        Already have an account?{' '}
        <Text color="#4299E1" as="span" onClick={() => navigate('/login')} cursor="pointer">
          Log in
        </Text>
      </Text>
    </Flex>
  );
};
