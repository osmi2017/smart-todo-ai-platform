import React from 'react';
import { Box, Text, Button, Icon, VStack, HStack } from '@chakra-ui/react';
import { FiInbox } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EmptyState = ({
  message,
  description,
  actionLabel,
  actionTo,
  onAction,
  icon = FiInbox,
  iconBg = 'gray.50',
  iconColor = 'gray.300',
  secondaryLabel,
  secondaryTo,
  onSecondary,
}) => {
  const { t } = useTranslation();
  const displayMessage = message || t('emptyStates.noItems');
  const primaryAction = (actionLabel && (actionTo || onAction));
  const secondaryAction = (secondaryLabel && (secondaryTo || onSecondary));
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
          bg={iconBg}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={icon} boxSize={8} color={iconColor} />
        </Box>
        <VStack spacing={1} maxW="md">
          <Text fontWeight="600" color="gray.700" fontSize="lg">
            {displayMessage}
          </Text>
          {description && (
            <Text color="gray.400" fontSize="sm">
              {description}
            </Text>
          )}
        </VStack>
        {(primaryAction || secondaryAction) && (
          <HStack spacing={3} wrap="wrap" justify="center">
            {primaryAction && (
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
            {secondaryAction && (
              <Button
                size="md"
                variant="outline"
                colorScheme="gray"
                {...(secondaryTo ? { as: RouterLink, to: secondaryTo } : { onClick: onSecondary })}
              >
                {secondaryLabel}
              </Button>
            )}
          </HStack>
        )}
      </VStack>
    </Box>
  );
};

export default EmptyState;
