import React from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Card,
  CardHeader,
  CardBody,
  Progress,
  Badge,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiTrendingUp } from 'react-icons/fi';

const Dashboard = () => {
  return (
    <Box>
      <Heading size="lg" mb={6}>Tableau de bord</Heading>
      
      {/* Statistiques */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <Flex justifyContent="space-between" alignItems="center">
                <Box>
                  <StatLabel>Projets actifs</StatLabel>
                  <StatNumber>12</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    2 nouveaux
                  </StatHelpText>
                </Box>
                <Icon as={FiTrendingUp} boxSize={10} color="blue.500" />
              </Flex>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <Flex justifyContent="space-between" alignItems="center">
                <Box>
                  <StatLabel>Tâches complétées</StatLabel>
                  <StatNumber>48</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    12% ce mois
                  </StatHelpText>
                </Box>
                <Icon as={FiCheckCircle} boxSize={10} color="green.500" />
              </Flex>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <Flex justifyContent="space-between" alignItems="center">
                <Box>
                  <StatLabel>En cours</StatLabel>
                  <StatNumber>23</StatNumber>
                  <StatHelpText>8 en retard</StatHelpText>
                </Box>
                <Icon as={FiClock} boxSize={10} color="orange.500" />
              </Flex>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <Flex justifyContent="space-between" alignItems="center">
                <Box>
                  <StatLabel>Score risque</StatLabel>
                  <StatNumber>23%</StatNumber>
                  <StatHelpText>
                    <StatArrow type="decrease" />
                    -5%
                  </StatHelpText>
                </Box>
                <Icon as={FiAlertCircle} boxSize={10} color="red.500" />
              </Flex>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Progression des projets */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader>
            <Heading size="md">Progression des projets</Heading>
          </CardHeader>
          <CardBody>
            <Box mb={4}>
              <Flex justifyContent="space-between" mb={2}>
                <Text fontWeight="medium">Site E-commerce</Text>
                <Badge colorScheme="green">75%</Badge>
              </Flex>
              <Progress value={75} colorScheme="green" size="sm" borderRadius="full" />
            </Box>
            <Box mb={4}>
              <Flex justifyContent="space-between" mb={2}>
                <Text fontWeight="medium">Application Mobile</Text>
                <Badge colorScheme="yellow">45%</Badge>
              </Flex>
              <Progress value={45} colorScheme="yellow" size="sm" borderRadius="full" />
            </Box>
            <Box mb={4}>
              <Flex justifyContent="space-between" mb={2}>
                <Text fontWeight="medium">API Backend</Text>
                <Badge colorScheme="blue">90%</Badge>
              </Flex>
              <Progress value={90} colorScheme="blue" size="sm" borderRadius="full" />
            </Box>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">Prédictions IA</Heading>
          </CardHeader>
          <CardBody>
            <Box p={4} bg="blue.50" borderRadius="lg">
              <Text fontWeight="bold" color="blue.700" mb={2}>
                ⚡ Tâches à risque
              </Text>
              <Text fontSize="sm" color="gray.600">
                3 tâches ont une probabilité de retard > 70%
              </Text>
            </Box>
            <Box p={4} bg="green.50" borderRadius="lg" mt={4}>
              <Text fontWeight="bold" color="green.700" mb={2}>
                🤖 Suggestions
              </Text>
              <Text fontSize="sm" color="gray.600">
                Priorité recommandée : "Développement frontend" en critique
              </Text>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default Dashboard;
