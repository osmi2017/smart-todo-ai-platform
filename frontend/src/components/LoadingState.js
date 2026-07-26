import React from 'react';
import { Box, Skeleton, SkeletonText, VStack, HStack, SimpleGrid, Card, CardBody } from '@chakra-ui/react';

const LoadingCard = () => (
  <Card>
    <CardBody>
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <Skeleton height="20px" width="60%" borderRadius="md" />
          <Skeleton height="20px" width="60px" borderRadius="full" />
        </HStack>
        <SkeletonText mt={2} noOfLines={2} spacing={3} />
        <HStack justify="space-between" mt={2}>
          <Skeleton height="16px" width="40%" borderRadius="md" />
          <Skeleton height="16px" width="30px" borderRadius="md" />
        </HStack>
      </VStack>
    </CardBody>
  </Card>
);

const LoadingState = ({ 
  message = 'Chargement...', 
  variant = 'default',
  count = 6 
}) => {
  if (variant === 'cards') {
    return (
      <Box>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {Array.from({ length: count }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  if (variant === 'table') {
    return (
      <VStack spacing={4} align="stretch">
        {Array.from({ length: count }).map((_, i) => (
          <HStack key={i} p={4} bg="white" borderRadius="xl" border="1px solid" borderColor="gray.100">
            <Skeleton height="40px" width="40px" borderRadius="lg" />
            <VStack flex={1} align="stretch" spacing={2}>
              <Skeleton height="16px" width="40%" borderRadius="md" />
              <Skeleton height="12px" width="60%" borderRadius="md" />
            </VStack>
            <Skeleton height="24px" width="80px" borderRadius="full" />
            <Skeleton height="24px" width="80px" borderRadius="full" />
          </HStack>
        ))}
      </VStack>
    );
  }

  return (
    <Box textAlign="center" py={16}>
      <VStack spacing={4}>
        <Box
          w={16}
          h={16}
          borderRadius="2xl"
          bg="gray.50"
          display="flex"
          alignItems="center"
          justifyContent="center"
          className="pulse-soft"
        >
          <Skeleton
            width="32px"
            height="32px"
            borderRadius="lg"
            startColor="brand.200"
            endColor="brand.100"
          />
        </Box>
        <VStack spacing={1}>
          <Skeleton height="16px" width="200px" borderRadius="md" />
          <Skeleton height="12px" width="150px" borderRadius="md" />
        </VStack>
      </VStack>
    </Box>
  );
};

export default LoadingState;
