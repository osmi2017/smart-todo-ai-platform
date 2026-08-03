import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box, Input, InputGroup, InputLeftElement, InputRightElement, List, ListItem,
  Text, useOutsideClick, Icon,
} from '@chakra-ui/react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder,
  searchPlaceholder,
  emptyMessage,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef(null);
  const inputRef = useRef(null);

  useOutsideClick({ ref: () => setIsOpen(false), handlerRef: ref });

  const labelFor = (val) => {
    const opt = options.find((o) => o.value === val);
    return opt ? opt.label : '';
  };

  useEffect(() => {
    setQuery(labelFor(value));
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const open = () => {
    setHighlightIndex(0);
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setHighlightIndex(0);
    open();
  };

  const select = (opt) => {
    setQuery(opt.label);
    setIsOpen(false);
    if (onChange) onChange(opt.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open();
      setHighlightIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      open();
      setHighlightIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        select(filtered[Math.min(highlightIndex, filtered.length - 1)]);
      } else {
        setQuery(labelFor(value));
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setQuery(labelFor(value));
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <Box position="relative" ref={ref}>
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <Icon as={FiSearch} color="gray.400" />
        </InputLeftElement>
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={() => filtered.length > 0 && open()}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!query.trim()) setQuery(labelFor(value));
          }}
          placeholder={searchPlaceholder || placeholder}
          autoComplete="off"
        />
        <InputRightElement pointerEvents="none">
          <Icon as={FiChevronDown} color="gray.400" />
        </InputRightElement>
      </InputGroup>

      {isOpen && (
        <List
          position="absolute"
          top="100%"
          left={0}
          right={0}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="lg"
          boxShadow="lg"
          zIndex={100}
          maxH="250px"
          overflowY="auto"
          mt={1}
        >
          {filtered.length === 0 ? (
            <ListItem p={3}>
              <Text fontSize="sm" color="gray.500">
                {emptyMessage || t('common.noResults')}
              </Text>
            </ListItem>
          ) : (
            filtered.map((opt, idx) => (
              <ListItem
                key={opt.value}
                p={2}
                px={3}
                cursor="pointer"
                bg={idx === highlightIndex ? 'blue.50' : undefined}
                _hover={{ bg: 'blue.50' }}
                onClick={() => select(opt)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <Text fontSize="sm">{opt.label}</Text>
              </ListItem>
            ))
          )}
        </List>
      )}
    </Box>
  );
};

export default SearchableSelect;
