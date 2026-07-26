import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  // Auto-collapse on smaller desktop screens
  useEffect(() => {
    if (isMobile === false) {
      const handleResize = () => {
        if (window.innerWidth < 1200) {
          setCollapsed(true);
        }
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  const sidebarWidth = isMobile ? 0 : collapsed ? 72 : 260;

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          isMobile={false}
        />
      )}

      {/* Main content */}
      <Flex
        direction="column"
        flex={1}
        ml={{ base: 0, lg: `${sidebarWidth}px` }}
        transition="margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        minW={0}
      >
        <Header isMobile={isMobile} onMobileMenuToggle={() => {}} />
        <Box
          as="main"
          p={{ base: 4, md: 6 }}
          bg="gray.50"
          flex={1}
          overflowY="auto"
          className="bg-gradient-mesh"
        >
          <Box className="fade-in">
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Layout;
