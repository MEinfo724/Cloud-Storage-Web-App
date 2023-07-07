import React from 'react';

import { Flex } from '@chakra-ui/react';

interface DefaultProps {
  children?: any;
}

export const HeaderContainer: React.FC<DefaultProps> = ({ children }) => {
  return (
    <Flex
      direction="row"
      w="full"
      align="center"
      justify="space-between"
      paddingLeft="30px"
      paddingRight="30px"
      paddingTop="10px"
      paddingBottom="10px"
    >
      {children}
    </Flex>
  );
};
