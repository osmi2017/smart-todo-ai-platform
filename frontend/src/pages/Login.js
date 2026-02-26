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
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';  // ← IMPORT AJOUTÉ

const Login = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useAuth();  // ← AJOUTE LE HOOK useAuth

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Récupère les valeurs des inputs
    const username = e.target.username.value;
    const password = e.target.password.value;
    
    console.log('Tentative de connexion avec:', username); // LOG
    
    const result = await login(username, password);
    
    console.log('Résultat connexion:', result); // LOG
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      toast({
        title: 'Erreur de connexion',
        description: result.error || 'Identifiants incorrects',
        status: 'error',
        duration: 3000,
      });
    }
    
    setIsLoading(false);
  };

  return (
    <Container maxW="lg" py={{ base: 12, md: 24 }}>
      <Card>
        <CardBody p={8}>
          <Stack spacing={6}>
            <Stack spacing={2} textAlign="center">
              <Heading size="xl">Smart Todo AI</Heading>
              <Text color="gray.600">
                Connectez-vous à votre espace
              </Text>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom d'utilisateur</FormLabel>
                  <Input
                    name="username"
                    type="text"
                    placeholder="john.doe"
                    autoComplete="username"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Mot de passe</FormLabel>
                  <InputGroup>
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <InputRightElement>
                      <IconButton
                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Masquer' : 'Afficher'}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  fontSize="md"
                  isLoading={isLoading}
                >
                  Se connecter
                </Button>
              </Stack>
            </form>

            <Stack spacing={1} textAlign="center">
              <Text fontSize="sm" color="gray.600">
                Pas encore de compte ?{' '}
                <Link as={RouterLink} to="/register" color="blue.500">
                  S'inscrire
                </Link>
              </Text>
              <Text fontSize="sm" color="gray.600">
                <Link as={RouterLink} to="/forgot-password" color="blue.500">
                  Mot de passe oublié ?
                </Link>
              </Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    </Container>
  );
};

export default Login;
