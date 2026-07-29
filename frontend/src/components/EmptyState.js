import React from 'react';
import { Box, Text, Button, Icon, VStack } from '@chakra-ui/react';
import { FiInbox } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EmptyState = ({ 
  message,
  description,
  actionLabel, 
  actionTo, 
  onAction,
  icon = FiInbox 
}) => {
  const { t } = useTranslation();
  const displayMessage = message || t('emptyStates.noItems');
  return (
    <Box
      textAlign="center"
      py={16}
      px={8}
      bg="white"
      borderRadius="2xl"
      border="1px dashed"
      borderColor="gray.200"
    >
      <VStack spacing={4}>
        <Box
          w={16}
          h={16}
          borderRadius="2xl"
          bg="gray.50"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={icon} boxSize={8} color="gray.300" />
        </Box>
        <VStack spacing={1}>
          <Text fontWeight="600" color="gray.700" fontSize="lg">
            {displayMessage}
          </Text>
          {description && (
            <Text color="gray.400" fontSize="sm">
              {description}
            </Text>
          )}
        </VStack>
        {(actionLabel && (actionTo || onAction)) && (
          <Button
            size="md"
            fontWeight="500"
            bgGradient="linear(135deg, brand.500, brand.600)"
            color="white"
            _hover={{
              bgGradient: "linear(135deg, brand.600, brand.700)",
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(59,91,219,0.3)',
            }}
            {...(actionTo ? { as: RouterLink, to: actionTo } : { onClick: onAction })}
          >
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default EmptyState;
