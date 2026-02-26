import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    <Flex h="100vh">
      <Sidebar />
      <Flex direction="column" flex={1} ml="250px">
        <Header />
        <Box as="main" p={6} bg="gray.50" flex={1} overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default Layout;
