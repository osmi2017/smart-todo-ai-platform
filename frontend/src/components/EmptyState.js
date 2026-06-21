import React from 'react';
import { Box, Text, Button } from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';

const EmptyState = ({ message = 'Aucun élément trouvé', actionLabel, actionTo, onAction }) => (
  <Box textAlign="center" py={10}>
    <Text color="gray.500">{message}</Text>
    {(actionLabel && (actionTo || onAction)) && (
      <Button
        mt={4}
        leftIcon={<FiPlus />}
        colorScheme="blue"
        {...(actionTo ? { as: RouterLink, to: actionTo } : { onClick: onAction })}
      >
        {actionLabel}
      </Button>
    )}
  </Box>
);

export default EmptyState;
