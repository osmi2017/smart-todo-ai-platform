import React from 'react';
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
  CardBody,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  Flex,
  Icon,
  HStack,
  VStack,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff, FiCpu, FiZap, FiShield, FiCheckCircle } from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useAuth();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const username = e.target.username.value;
    const password = e.target.password.value;

    const result = await login(username, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      toast({
        title: t('auth.loginError'),
        description: result.error || t('auth.invalidCredentials'),
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    }

    setIsLoading(false);
  };

  const features = [
    { icon: FiZap, text: t('auth.features.taskManagement') },
    { icon: FiShield, text: t('auth.features.multiTenant') },
    { icon: FiCheckCircle, text: t('auth.features.ai') },
  ];

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
        {/* Decorative elements */}
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
              {t('auth.platformDesc')}
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
        <Box w="100%" maxW="420px">
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
              {t('auth.welcome')}
            </Heading>
            <Text color="gray.500" fontSize="md">
              {t('auth.loginSubtitleDesc')}
            </Text>
          </VStack>

          <Card p={8} shadow={{ base: 'sm', md: 'lg' }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={5}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.700">
                    {t('auth.username')}
                  </FormLabel>
                  <Input
                    name="username"
                    type="text"
                    placeholder="john.doe"
                    autoComplete="username"
                    size="lg"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _hover={{ borderColor: 'gray.300' }}
                    _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(59,91,219,0.1)' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="500" color="gray.700">
                    {t('auth.password')}
                  </FormLabel>
                  <InputGroup size="lg">
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      bg="gray.50"
                      border="1px solid"
                      borderColor="gray.200"
                      _hover={{ borderColor: 'gray.300' }}
                      _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(59,91,219,0.1)' }}
                    />
                    <InputRightElement>
                      <IconButton
                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Masquer' : 'Afficher'}
                        color="gray.400"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Button
                  type="submit"
                  size="lg"
                  fontSize="md"
                  fontWeight="600"
                  isLoading={isLoading}
                  loadingText={t('auth.loginLoading')}
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
                  {t('auth.loginButton')}
                </Button>
              </Stack>
            </form>

            <VStack spacing={3} mt={6}>
              <Text fontSize="sm" color="gray.500">
                {t('auth.noAccount')}{' '}
                <Link
                  as={RouterLink}
                  to="/register"
                  color="brand.500"
                  fontWeight="600"
                  _hover={{ color: 'brand.600', textDecoration: 'underline' }}
                >
                  {t('auth.registerButton')}
                </Link>
              </Text>
              <Link
                as={RouterLink}
                to="/forgot-password"
                fontSize="sm"
                color="gray.400"
                _hover={{ color: 'brand.500' }}
              >
                {t('auth.forgotPassword')}
              </Link>
            </VStack>
          </Card>
        </Box>
      </Box>
    </Flex>
  );
};

export default Login;
