import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  Text,
  HStack,
  Badge,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
  task: { label: 'Tâches', color: 'blue' },
  project: { label: 'Projets', color: 'green' },
  meeting: { label: 'Réunions', color: 'purple' },
  file: { label: 'Fichiers', color: 'orange' },
};

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { axiosInstance } = useAuth();
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const search = useCallback(async (q) => {
    if (q.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.get('/search/', { params: { q } });
      setResults(res.data);
      setIsOpen(res.data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [axiosInstance]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (item) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    navigate(item.url);
  };

  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  return (
    <Box ref={containerRef} position="relative" maxW="400px" w="full" display={{ base: 'none', sm: 'block' }}>
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <FiSearch color="gray.300" />
        </InputLeftElement>
        <Input
          type="search"
          placeholder="Rechercher..."
          borderRadius="full"
          bg="gray.50"
          fontSize="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          _focus={{ bg: 'white', boxShadow: '0 0 0 2px', boxShadowColor: 'brand.200' }}
        />
        {loading && (
          <Box position="absolute" right={3} top={2}>
            <Spinner size="sm" />
          </Box>
        )}
      </InputGroup>
      {isOpen && (
        <Box
          position="absolute"
          left={0}
          right={0}
          mt={2}
          maxH="400px"
          overflowY="auto"
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          boxShadow="lg"
          zIndex={9999}
        >
          {Object.entries(grouped).map(([type, items]) => (
            <Box key={type}>
              <Text
                px={4}
                pt={3}
                pb={1}
                fontSize="xs"
                fontWeight="700"
                textTransform="uppercase"
                color="gray.500"
                letterSpacing="wider"
              >
                {TYPE_CONFIG[type]?.label || type}
              </Text>
              <List>
                {items.map((item) => (
                  <ListItem
                    key={`${item.type}-${item.id}`}
                    px={4}
                    py={2}
                    cursor="pointer"
                    _hover={{ bg: hoverBg }}
                    onClick={() => handleSelect(item)}
                  >
                    <HStack justify="space-between">
                      <Box flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                          {item.title}
                        </Text>
                        {item.description && (
                          <Text fontSize="xs" color="gray.500" noOfLines={1} mt={0.5}>
                            {item.description}
                          </Text>
                        )}
                      </Box>
                      {item.badge && (
                        <Badge
                          colorScheme={TYPE_CONFIG[item.type]?.color || 'gray'}
                          variant="subtle"
                          fontSize="xs"
                          flexShrink={0}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </HStack>
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default GlobalSearch;
