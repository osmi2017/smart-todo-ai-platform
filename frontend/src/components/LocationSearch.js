import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Input, InputGroup, InputLeftElement, List, ListItem,
  Text, HStack, VStack, Icon, Spinner, useOutsideClick, Badge,
} from '@chakra-ui/react';
import { FiMapPin, FiSearch, FiNavigation } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km) => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
};

const LocationSearch = ({ value, onChange, onSelect, placeholder, onDistanceChange }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [selectedDistance, setSelectedDistance] = useState(null);
  const ref = useRef(null);
  const debounceRef = useRef(null);
  const { axiosInstance } = useAuth();

  useOutsideClick({ ref: () => setIsOpen(false), handlerRef: ref });

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGeoError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const searchCity = async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/geocode/?q=${encodeURIComponent(q)}`);
      const data = res.data;
      if (Array.isArray(data) && data.length > 0) {
        const enriched = data.map((item) => ({
          ...item,
          latitude: item.latitude,
          longitude: item.longitude,
          _distance: userLocation
            ? haversineDistance(userLocation.lat, userLocation.lng, item.latitude, item.longitude)
            : null,
        }));
        enriched.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
        setResults(enriched);
        setIsOpen(true);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Geocode error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCity(val), 400);
  };

  const handleSelect = (item) => {
    const displayName = item.region
      ? `${item.name}, ${item.region}, ${item.country}`
      : `${item.name}, ${item.country}`;
    setQuery(displayName);
    setIsOpen(false);
    setResults([]);
    const dist = item._distance ?? (userLocation
      ? haversineDistance(userLocation.lat, userLocation.lng, item.latitude, item.longitude)
      : null);
    setSelectedDistance(dist);
    if (onSelect) {
      onSelect({
        name: displayName,
        lat: item.latitude,
        lng: item.longitude,
        distance: dist,
      });
    }
    if (onChange) onChange(displayName);
    if (onDistanceChange) onDistanceChange(dist);
  };

  return (
    <Box position="relative" ref={ref}>
      <InputGroup>
        <InputLeftElement>
          {loading ? (
            <Spinner size="sm" color="blue.500" />
          ) : (
            <Icon as={FiSearch} color="gray.400" />
          )}
        </InputLeftElement>
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder || 'Rechercher une destination...'}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          autoComplete="off"
        />
      </InputGroup>

      {userLocation && (
        <VStack spacing={0} align="start" mt={1} px={1}>
          <HStack spacing={1}>
            <Icon as={FiNavigation} color="green.500" boxSize={3} />
            <Text fontSize="xs" color="green.600">
              Position actuelle : {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </Text>
          </HStack>
          {selectedDistance != null && (
            <HStack spacing={1} ml={4}>
              <Badge colorScheme="purple" fontSize="xs">
                Distance : {formatDistance(selectedDistance)}
              </Badge>
            </HStack>
          )}
        </VStack>
      )}

      {isOpen && results.length > 0 && (
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
          {results.map((item, idx) => (
            <ListItem
              key={`${item.name}-${idx}`}
              p={3}
              cursor="pointer"
              _hover={{ bg: 'blue.50' }}
              borderBottomWidth="1px"
              borderColor="gray.100"
              onClick={() => handleSelect(item)}
            >
              <HStack spacing={2} justify="space-between">
                <HStack spacing={2}>
                  <Icon as={FiMapPin} color="blue.500" boxSize={4} flexShrink={0} />
                  <Box>
                    <Text fontWeight="500" fontSize="sm">{item.name}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {item.region ? `${item.region}, ` : ''}{item.country}
                      <Text as="span" ml={2} color="gray.400">
                        ({Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)})
                      </Text>
                    </Text>
                  </Box>
                </HStack>
                {item._distance != null && (
                  <Badge colorScheme="purple" fontSize="xs" flexShrink={0}>
                    {formatDistance(item._distance)}
                  </Badge>
                )}
              </HStack>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default LocationSearch;
