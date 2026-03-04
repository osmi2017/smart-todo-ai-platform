import React from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Select,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Analytics = () => {
  // Données mockées pour les graphiques
  const weeklyData = [
    { name: 'Lun', tâches: 8, complétées: 5 },
    { name: 'Mar', tâches: 12, complétées: 8 },
    { name: 'Mer', tâches: 10, complétées: 7 },
    { name: 'Jeu', tâches: 15, complétées: 10 },
    { name: 'Ven', tâches: 9, complétées: 6 },
    { name: 'Sam', tâches: 4, complétées: 3 },
    { name: 'Dim', tâches: 2, complétées: 1 },
  ];

  const priorityData = [
    { name: 'Basse', value: 15, color: '#718096' },
    { name: 'Moyenne', value: 25, color: '#4299E1' },
    { name: 'Haute', value: 12, color: '#ED8936' },
    { name: 'Critique', value: 8, color: '#F56565' },
  ];

  const projectData = [
    { name: 'Frontend', complétées: 45, total: 60, progression: 75 },
    { name: 'Backend', complétées: 30, total: 50, progression: 60 },
    { name: 'ML Service', complétées: 15, total: 40, progression: 37.5 },
    { name: 'Mobile', complétées: 10, total: 30, progression: 33.3 },
  ];

  const userPerformance = [
    { user: 'Jean', tâches: 25, complétées: 20, retard: 2 },
    { user: 'Marie', tâches: 30, complétées: 28, retard: 1 },
    { user: 'Pierre', tâches: 20, complétées: 15, retard: 3 },
    { user: 'Sophie', tâches: 22, complétées: 18, retard: 2 },
  ];

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <HStack justify="space-between">
          <Heading size="lg">Analytics</Heading>
          <Select width="200px" size="sm" defaultValue="week">
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </Select>
        </HStack>

        {/* KPIs */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Taux de complétion</StatLabel>
                <StatNumber>78%</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  +12% vs mois dernier
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Temps moyen par tâche</StatLabel>
                <StatNumber>4.2h</StatNumber>
                <StatHelpText>
                  <StatArrow type="decrease" />
                  -0.5h vs mois dernier
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Tâches en retard</StatLabel>
                <StatNumber color="red.500">8</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  +2 cette semaine
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Précision ML</StatLabel>
                <StatNumber>85%</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  +5% ce mois
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Graphiques */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Activité hebdomadaire */}
          <Card>
            <CardHeader>
              <Heading size="md">Activité hebdomadaire</Heading>
            </CardHeader>
            <CardBody>
              <Box height="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tâches" stroke="#4299E1" strokeWidth={2} />
                    <Line type="monotone" dataKey="complétées" stroke="#48BB78" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardBody>
          </Card>

          {/* Distribution par priorité */}
          <Card>
            <CardHeader>
              <Heading size="md">Tâches par priorité</Heading>
            </CardHeader>
            <CardBody>
              <Box height="300px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardBody>
          </Card>

          {/* Progression des projets */}
          <Card gridColumn="span 2">
            <CardHeader>
              <Heading size="md">Progression des projets</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                {projectData.map((project, index) => (
                  <Box key={index} width="100%">
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="medium">{project.name}</Text>
                      <Text fontSize="sm">
                        {project.complétées}/{project.total} tâches
                      </Text>
                    </HStack>
                    <Progress
                      value={project.progression}
                      colorScheme={project.progression > 70 ? 'green' : project.progression > 40 ? 'blue' : 'orange'}
                      size="md"
                      borderRadius="full"
                    />
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>

          {/* Performance par utilisateur */}
          <Card gridColumn="span 2">
            <CardHeader>
              <Heading size="md">Performance par utilisateur</Heading>
            </CardHeader>
            <CardBody>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Utilisateur</Th>
                    <Th isNumeric>Tâches assignées</Th>
                    <Th isNumeric>Tâches complétées</Th>
                    <Th isNumeric>Taux complétion</Th>
                    <Th isNumeric>En retard</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {userPerformance.map((user, index) => (
                    <Tr key={index}>
                      <Td fontWeight="medium">{user.user}</Td>
                      <Td isNumeric>{user.tâches}</Td>
                      <Td isNumeric>{user.complétées}</Td>
                      <Td isNumeric>
                        <Badge colorScheme={user.complétées / user.tâches > 0.8 ? 'green' : 'yellow'}>
                          {Math.round((user.complétées / user.tâches) * 100)}%
                        </Badge>
                      </Td>
                      <Td isNumeric>
                        <Badge colorScheme={user.retard > 2 ? 'red' : 'orange'}>
                          {user.retard}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default Analytics;
