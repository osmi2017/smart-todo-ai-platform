import React from 'react';
import { Box, Spinner, Text } from '@chakra-ui/react';

const LoadingState = ({ message = 'Chargement...' }) => (
  <Box textAlign="center" py={10}>
    <Spinner size="xl" color="blue.500" />
    <Text mt={4}>{message}</Text>
  </Box>
);

export default LoadingState;
