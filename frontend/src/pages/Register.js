import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  Text,
  Link,
  Card,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  FormErrorMessage,
  Flex,
  Icon,
  HStack,
  VStack,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff, FiCpu, FiZap, FiShield, FiCheckCircle } from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const toast = useToast();
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "Nom d'utilisateur requis";
    else if (formData.username.length < 3) newErrors.username = "Minimum 3 caractères";
    if (!formData.email) newErrors.email = "Email requis";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email invalide";
    if (!formData.password) newErrors.password = "Mot de passe requis";
    else if (formData.password.length < 6) newErrors.password = "Minimum 6 caractères";
    if (!formData.password2) newErrors.password2 = "Confirmation requise";
    else if (formData.password !== formData.password2) {
      newErrors.password2 = "Les mots de passe ne correspondent pas";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);
    const result = await register(formData);
    if (result.success) {
      toast({
        title: 'Inscription réussie',
        description: 'Vous pouvez maintenant vous connecter',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/login');
    }
    setIsLoading(false);
  };

  const features = [
    { icon: FiZap, text: 'Gestion intelligente des tâches' },
    { icon: FiShield, text: 'Sécurité multi-tenant' },
    { icon: FiCheckCircle, text: 'Analytics et prédictions IA' },
  ];

  const inputProps = {
    size: 'lg',
    bg: 'gray.50',
    border: '1px solid',
    borderColor: 'gray.200',
    _hover: { borderColor: 'gray.300' },
    _focus: { bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(59,91,219,0.1)' },
  };

  return (
    <Flex minH="100vh">
      {/* Left panel - Branding */}
      <Box
        display={{ base: 'none', md: 'flex' }}
        flex={1}
        bgGradient="linear(135deg, #1e3288 0%, #3b5bdb 40%, #d946ef 100%)"
        direction="column"
        justify="center"
        align="center"
        p={12}
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="10%"
          left="10%"
          w="300px"
          h="300px"
          borderRadius="full"
          bg="rgba(255,255,255,0.05)"
        />
        <Box
          position="absolute"
          bottom="15%"
          right="15%"
          w="200px"
          h="200px"
          borderRadius="full"
          bg="rgba(255,255,255,0.05)"
        />

        <VStack spacing={10} zIndex={1}>
          <Box
            w={20}
            h={20}
            borderRadius="2xl"
            bg="rgba(255,255,255,0.15)"
            backdropFilter="blur(10px)"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={FiCpu} color="white" boxSize={10} />
          </Box>

          <VStack spacing={3} textAlign="center">
            <Heading color="white" fontSize="3xl" fontWeight="700">
              SmartTodoAI
            </Heading>
            <Text color="whiteAlpha.800" fontSize="lg" maxW="sm">
              Rejoignez des milliers d'équipes qui optimisent leur productivité
            </Text>
          </VStack>

          <VStack spacing={4} align="flex-start">
            {features.map((feature, i) => (
              <HStack key={i} spacing={3} color="white">
                <Box
                  w={8}
                  h={8}
                  borderRadius="lg"
                  bg="rgba(255,255,255,0.15)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={feature.icon} boxSize={4} />
                </Box>
                <Text fontSize="sm" fontWeight="500">
                  {feature.text}
                </Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </Box>

      {/* Right panel - Form */}
      <Box flex={1} display="flex" align="center" justify="center" p={{ base: 6, md: 12 }} bg="gray.50">
        <Box w="100%" maxW="480px">
          {/* Mobile logo */}
          <HStack
            spacing={3}
            mb={8}
            display={{ base: 'flex', md: 'none' }}
            justify="center"
          >
            <Box
              w={12}
              h={12}
              borderRadius="xl"
              bgGradient="linear(135deg, brand.500, accent.500)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiCpu} color="white" boxSize={6} />
            </Box>
            <Heading size="xl" fontWeight="700">
              SmartTodoAI
            </Heading>
          </HStack>

          <VStack spacing={2} mb={8} textAlign="center">
            <Heading size="xl" fontWeight="700" color="gray.800">
              Créer un compte
            </Heading>
            <Text color="gray.500" fontSize="md">
              Commencez à gérer vos projets intelligemment
            </Text>
          </VStack>

          <Card p={8} shadow={{ base: 'sm', md: 'lg' }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={5}>
                <HStack spacing={4}>
                  <FormControl isRequired isInvalid={!!errors.first_name}>
                    <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Prénom</FormLabel>
                    <Input
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="Jean"
                      {...inputProps}
                    />
                    <FormErrorMessage>{errors.first_name}</FormErrorMessage>
                  </FormControl>
                  <FormControl isRequired isInvalid={!!errors.last_name}>
                    <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Nom</FormLabel>
                    <Input
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Dupont"
                      {...inputProps}
                    />
                    <FormErrorMessage>{errors.last_name}</FormErrorMessage>
                  </FormControl>
                </HStack>

                <FormControl isRequired isInvalid={!!errors.username}>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Nom d'utilisateur</FormLabel>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="jdupont"
                    {...inputProps}
                  />
                  <FormErrorMessage>{errors.username}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.email}>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jean.dupont@email.com"
                    {...inputProps}
                  />
                  <FormErrorMessage>{errors.email}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.password}>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Mot de passe</FormLabel>
                  <InputGroup size="lg">
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      {...inputProps}
                    />
                    <InputRightElement>
                      <IconButton
                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        color="gray.400"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.password2}>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Confirmer le mot de passe</FormLabel>
                  <InputGroup size="lg">
                    <Input
                      name="password2"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.password2}
                      onChange={handleChange}
                      placeholder="••••••••"
                      {...inputProps}
                    />
                    <InputRightElement>
                      <IconButton
                        icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        color="gray.400"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.password2}</FormErrorMessage>
                </FormControl>

                <Button
                  type="submit"
                  size="lg"
                  fontSize="md"
                  fontWeight="600"
                  isLoading={isLoading}
                  loadingText="Inscription..."
                  bgGradient="linear(135deg, brand.500, brand.600)"
                  color="white"
                  _hover={{
                    bgGradient: "linear(135deg, brand.600, brand.700)",
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(59,91,219,0.3)',
                  }}
                  _active={{ transform: 'translateY(0)' }}
                  w="full"
                >
                  S'inscrire
                </Button>
              </Stack>
            </form>

            <VStack spacing={3} mt={6}>
              <Text fontSize="sm" color="gray.500">
                Déjà un compte ?{' '}
                <Link
                  as={RouterLink}
                  to="/login"
                  color="brand.500"
                  fontWeight="600"
                  _hover={{ color: 'brand.600', textDecoration: 'underline' }}
                >
                  Se connecter
                </Link>
              </Text>
            </VStack>
          </Card>
        </Box>
      </Box>
    </Flex>
  );
};

export default Register;
