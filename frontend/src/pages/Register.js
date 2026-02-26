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
  CardBody,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  FormErrorMessage,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
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
    // Efface l'erreur du champ quand l'utilisateur tape
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
      });
      navigate('/login');
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
                Créez votre compte gratuitement
              </Text>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
                  <FormControl isRequired isInvalid={!!errors.first_name}>
                    <FormLabel>Prénom</FormLabel>
                    <Input
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="Jean"
                    />
                    <FormErrorMessage>{errors.first_name}</FormErrorMessage>
                  </FormControl>

                  <FormControl isRequired isInvalid={!!errors.last_name}>
                    <FormLabel>Nom</FormLabel>
                    <Input
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Dupont"
                    />
                    <FormErrorMessage>{errors.last_name}</FormErrorMessage>
                  </FormControl>
                </Stack>

                <FormControl isRequired isInvalid={!!errors.username}>
                  <FormLabel>Nom d'utilisateur</FormLabel>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="jdupont"
                  />
                  <FormErrorMessage>{errors.username}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.email}>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jean.dupont@email.com"
                  />
                  <FormErrorMessage>{errors.email}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.password}>
                  <FormLabel>Mot de passe</FormLabel>
                  <InputGroup>
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
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
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.password2}>
                  <FormLabel>Confirmer le mot de passe</FormLabel>
                  <InputGroup>
                    <Input
                      name="password2"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.password2}
                      onChange={handleChange}
                      placeholder="••••••••"
                    />
                    <InputRightElement>
                      <IconButton
                        icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.password2}</FormErrorMessage>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  fontSize="md"
                  isLoading={isLoading}
                >
                  S'inscrire
                </Button>
              </Stack>
            </form>

            <Stack spacing={1} textAlign="center">
              <Text fontSize="sm" color="gray.600">
                Déjà un compte ?{' '}
                <Link as={RouterLink} to="/login" color="blue.500">
                  Se connecter
                </Link>
              </Text>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    </Container>
  );
};

export default Register;
