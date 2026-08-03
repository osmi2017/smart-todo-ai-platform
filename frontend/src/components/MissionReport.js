import React, { useRef } from 'react';
import {
  Box, Button, VStack, HStack, Heading, Text, Divider, Badge, Icon,
  SimpleGrid, Flex, useColorModeValue,
} from '@chakra-ui/react';
import {
  FiPrinter, FiDownload, FiCalendar, FiMapPin, FiUsers,
  FiFileText, FiLink, FiFlag,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');

const MissionReport = ({ mission, formatCost, getCostBreakdown }) => {
  const { t, i18n } = useTranslation();
  const printRef = useRef(null);
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const cur = (mission.currency || 'XOF').toUpperCase();
  const breakdown = getCostBreakdown(mission);
  const leader = mission.members?.find(m => m.is_leader);
  const statusLabels = {
    planned: t('missions.planned'),
    in_progress: t('missions.inProgress'),
    completed: t('missions.completed'),
    cancelled: t('missions.cancelled'),
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString(dateLocale, {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (value) =>
    Number(value ?? 0).toLocaleString(dateLocale);

  const formatDistance = (value) => {
    if (value == null) return '—';
    const v = parseFloat(value);
    if (v < 1) return `${Math.round(v * 1000)} m`;
    if (v < 100) return `${v.toFixed(1)} km`;
    return `${Math.round(v).toLocaleString(dateLocale)} km`;
  };

  const buildReportHtml = () => {
    const r = t('missionDetail.report'); // title
    const info = (label, value) =>
      `<div class="info"><strong>${escapeHtml(label)}</strong> ${escapeHtml(value)}</div>`;

    const membersRows = (mission.members || []).map((m) => `
      <tr>
        <td>${escapeHtml(m.user_name)}</td>
        <td>${escapeHtml(m.user_email)}</td>
        <td>${m.is_leader ? escapeHtml(t('missions.chief')) : '—'}</td>
      </tr>
    `).join('');

    const tasksRows = (mission.tasks_detail || []).map((task) => `
      <tr>
        <td>${escapeHtml(task.title)}</td>
        <td>${escapeHtml(task.status)}</td>
        <td>${task.assigned_to_name ? escapeHtml(task.assigned_to_name) : '—'}</td>
      </tr>
    `).join('');

    const milestonesRows = (mission.milestones_detail || []).map((ms) => `
      <tr>
        <td>${escapeHtml(ms.name)}</td>
        <td>${formatDate(ms.due_date)}</td>
        <td>${ms.progress || 0}%</td>
        <td>${escapeHtml(ms.status)}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="${i18n.language}">
<head><meta charset="utf-8"/>
<title>${escapeHtml(r)} - ${escapeHtml(mission.title)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; margin: 0 0 6px; }
  h2 { font-size: 15px; color: #555; margin: 26px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; text-transform: uppercase; }
  .subtitle { font-size: 12px; color: #777; margin-bottom: 20px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 8px; gap: 20px; }
  .info { font-size: 13px; color: #444; margin-bottom: 4px; }
  .info strong { color: #222; }
  .desc { font-size: 13px; color: #444; line-height: 1.5; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 12.5px; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  .num { text-align: right; }
  .total-row td { background: #e8f4fd; font-weight: 700; }
  .narrative { font-size: 13px; line-height: 1.6; color: #333; }
  .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
  .empty { color: #999; font-style: italic; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <h1>${escapeHtml(r)}</h1>
  <div class="subtitle">${escapeHtml(mission.title)} — ${escapeHtml(statusLabels[mission.status] || mission.status)}</div>

  <div class="header">
    <div>
      ${info(t('missionReport.launchedBy'), mission.created_by_name || '—')}
      ${info(t('missionReport.startDate'), formatDate(mission.start_date))}
      ${info(t('missionReport.endDate'), formatDate(mission.end_date))}
      ${info(t('missionReport.duration'), mission.duration_days != null ? `${mission.duration_days} ${t('expenseReport.days')}` : '—')}
    </div>
    <div style="text-align:right">
      ${info(t('missionReport.manager'), leader?.user_name || '—')}
      ${info(t('missionReport.currency'), cur)}
      ${info(t('missionReport.status'), statusLabels[mission.status] || mission.status)}
    </div>
  </div>

  <h2>${escapeHtml(t('missionReport.destination'))}</h2>
  <div class="info"><strong>${escapeHtml(t('missionReport.destinationName'))}</strong> ${escapeHtml(mission.destination_name)}</div>
  ${mission.destination_lat != null && mission.destination_lng != null ? `
  <div class="info"><strong>${escapeHtml(t('missionReport.coordinates'))}</strong> ${parseFloat(mission.destination_lat).toFixed(6)}, ${parseFloat(mission.destination_lng).toFixed(6)}</div>
  ` : ''}
  <div class="info"><strong>${escapeHtml(t('missionReport.distance'))}</strong> ${formatDistance(mission.distance_km)}</div>

  ${mission.description ? `
  <h2>${escapeHtml(t('missionReport.description'))}</h2>
  <div class="desc">${escapeHtml(mission.description)}</div>
  ` : ''}

  <h2>${escapeHtml(t('missionReport.team'))} (${mission.members?.length || 0})</h2>
  <table>
    <thead><tr><th>${escapeHtml(t('missionReport.member'))}</th><th>${escapeHtml(t('missionReport.email'))}</th><th>${escapeHtml(t('missionReport.role'))}</th></tr></thead>
    <tbody>${membersRows || `<tr><td colspan="3" class="empty">${escapeHtml(t('missions.noMembers'))}</td></tr>`}</tbody>
  </table>

  <h2>${escapeHtml(t('missionReport.expenses'))}</h2>
  <table>
    <thead><tr><th>${escapeHtml(t('expenseReport.designation'))}</th><th class="num">${escapeHtml(t('expenseReport.quantity'))}</th><th class="num">${escapeHtml(t('expenseReport.unitCost'))} (${escapeHtml(cur)})</th><th class="num">${escapeHtml(t('expenseReport.amount'))} (${escapeHtml(cur)})</th></tr></thead>
    <tbody>
      <tr><td>${escapeHtml(t('expenseReport.perDiem'))}</td><td class="num">${breakdown.days} ${escapeHtml(t('expenseReport.days'))}</td><td class="num">${formatNumber(mission.cost_per_diem)}</td><td class="num">${formatNumber(breakdown.perDiemTotal)}</td></tr>
      <tr><td>${escapeHtml(t('expenseReport.accommodation'))}</td><td class="num">${breakdown.accomDays} ${escapeHtml(t('expenseReport.nights'))}</td><td class="num">${formatNumber(mission.cost_accommodation)}</td><td class="num">${formatNumber(breakdown.accomTotal)}</td></tr>
      <tr><td>${escapeHtml(t('expenseReport.transport'))}</td><td class="num">—</td><td class="num">—</td><td class="num">${formatNumber(breakdown.transport)}</td></tr>
      <tr><td>${escapeHtml(t('expenseReport.otherExpenses'))}</td><td class="num">—</td><td class="num">—</td><td class="num">${formatNumber(breakdown.other)}</td></tr>
      <tr class="total-row"><td colspan="3">${escapeHtml(t('expenseReport.total'))}</td><td class="num">${formatNumber(breakdown.total)} ${escapeHtml(cur)}</td></tr>
    </tbody>
  </table>

  ${mission.project_detail || (mission.tasks_detail?.length) || (mission.milestones_detail?.length) ? `
  <h2>${escapeHtml(t('missionDetail.associations'))}</h2>
  ${mission.project_detail ? `
  <div class="info"><strong>${escapeHtml(t('missionDetail.associatedProject'))}</strong> ${escapeHtml(mission.project_detail.name)} — ${mission.project_detail.progress || 0}%</div>
  ` : ''}
  ${mission.tasks_detail?.length ? `
  <table>
    <thead><tr><th>${escapeHtml(t('missionReport.task'))}</th><th>${escapeHtml(t('missionReport.status'))}</th><th>${escapeHtml(t('missionReport.assigned'))}</th></tr></thead>
    <tbody>${tasksRows}</tbody>
  </table>
  ` : ''}
  ${mission.milestones_detail?.length ? `
  <table>
    <thead><tr><th>${escapeHtml(t('missionReport.milestone'))}</th><th>${escapeHtml(t('missionReport.dueDate'))}</th><th>${escapeHtml(t('missionReport.progress'))}</th><th>${escapeHtml(t('missionReport.status'))}</th></tr></thead>
    <tbody>${milestonesRows}</tbody>
  </table>
  ` : ''}
  ` : ''}

  ${mission.mission_report ? `
  <h2>${escapeHtml(t('missionDetail.missionReportTitle'))}</h2>
  <div class="narrative">${escapeHtml(mission.mission_report)}</div>
  ` : ''}

  ${mission.expense_report ? `
  <h2>${escapeHtml(t('missionReport.expenseNarrative'))}</h2>
  <div class="narrative">${escapeHtml(mission.expense_report)}</div>
  ` : ''}

  <div class="footer">${escapeHtml(t('expenseReport.generatedOn'))} ${new Date().toLocaleDateString(dateLocale)} ${escapeHtml(t('expenseReport.at'))} ${new Date().toLocaleTimeString(dateLocale)}</div>
</body></html>`;
  };

  const openReportWindow = (printDelay = 0) => {
    const win = window.open('', '_blank');
    win.document.write(buildReportHtml());
    win.document.close();
    setTimeout(() => { win.print(); }, printDelay);
  };

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBg = useColorModeValue('gray.50', 'gray.900');

  return (
    <VStack spacing={4} align="stretch">
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
        <Heading size="sm">{t('missionDetail.missionReportTitle')}</Heading>
        <HStack spacing={2}>
          <Button size="sm" leftIcon={<FiPrinter />} onClick={() => openReportWindow(0)} variant="outline">
            {t('expenseReport.print')}
          </Button>
          <Button size="sm" leftIcon={<FiDownload />} onClick={() => openReportWindow(300)} variant="outline" colorScheme="green">
            {t('expenseReport.downloadPdf')}
          </Button>
        </HStack>
      </Flex>

      <Box ref={printRef} bg={codeBg} p={5} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
        <VStack spacing={5} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <Heading size="md">{t('missionDetail.missionReportTitle')}</Heading>
            <Text fontWeight="600" mt={1}>{mission.title}</Text>
            <Badge colorScheme={mission.status === 'completed' ? 'green' : mission.status === 'in_progress' ? 'orange' : mission.status === 'cancelled' ? 'red' : 'blue'} mt={2}>
              {statusLabels[mission.status] || mission.status}
            </Badge>
          </Box>

          <Divider />

          {/* General info */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <VStack align="start" spacing={1}>
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.launchedBy')}</Text> {mission.created_by_name || '—'}</Text>
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.manager')}</Text> {leader?.user_name || '—'}</Text>
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.startDate')}</Text> {formatDate(mission.start_date)}</Text>
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.endDate')}</Text> {formatDate(mission.end_date)}</Text>
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.duration')}</Text> {mission.duration_days != null ? `${mission.duration_days} ${t('expenseReport.days')}` : '—'}</Text>
            </VStack>
            <VStack align="start" spacing={1}>
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.destinationName')}</Text> {mission.destination_name}</Text>
              {mission.destination_lat != null && mission.destination_lng != null && (
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.coordinates')}</Text> {parseFloat(mission.destination_lat).toFixed(6)}, {parseFloat(mission.destination_lng).toFixed(6)}</Text>
              )}
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionReport.distance')}</Text> {formatDistance(mission.distance_km)}</Text>
              <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.currency')}</Text> {cur}</Text>
            </VStack>
          </SimpleGrid>

          {mission.description && (
            <>
              <Divider />
              <Box>
                <Heading size="xs" mb={2}><Icon as={FiFileText} mr={1} />{t('missionReport.description')}</Heading>
                <Text fontSize="sm" whiteSpace="pre-wrap">{mission.description}</Text>
              </Box>
            </>
          )}

          <Divider />

          {/* Team */}
          <Box>
            <Heading size="xs" mb={2}><Icon as={FiUsers} mr={1} />{t('missionReport.team')} ({mission.members?.length || 0})</Heading>
            <VStack spacing={1} align="stretch">
              {(mission.members || []).map(m => (
                <Flex key={m.id} p={2} bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor} justify="space-between" align="center">
                  <Text fontSize="sm" fontWeight="500">{m.user_name}{m.is_leader ? ` (${t('missions.chief')})` : ''}</Text>
                  <Text fontSize="xs" color="gray.500">{m.user_email || '—'}</Text>
                </Flex>
              ))}
              {(!mission.members || mission.members.length === 0) && (
                <Text fontSize="sm" color="gray.400" fontStyle="italic">{t('missions.noMembers')}</Text>
              )}
            </VStack>
          </Box>

          <Divider />

          {/* Expenses */}
          <Box>
            <Heading size="xs" mb={2}><Icon as={FiFlag} mr={1} />{t('missionReport.expenses')}</Heading>
            <Box overflowX="auto">
              <Box as="table" w="100%" borderWidth="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden" fontSize="sm">
                <Box as="thead" bg="gray.100">
                  <Box as="tr">
                    <Box as="th" p={2} textAlign="left" fontWeight="600">{t('expenseReport.designation')}</Box>
                    <Box as="th" p={2} textAlign="right" fontWeight="600">{t('expenseReport.quantity')}</Box>
                    <Box as="th" p={2} textAlign="right" fontWeight="600">{t('expenseReport.unitCost')} ({cur})</Box>
                    <Box as="th" p={2} textAlign="right" fontWeight="600">{t('expenseReport.amount')} ({cur})</Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                    <Box as="td" p={2}>{t('expenseReport.perDiem')}</Box>
                    <Box as="td" p={2} textAlign="right">{breakdown.days} {t('expenseReport.days')}</Box>
                    <Box as="td" p={2} textAlign="right">{formatNumber(mission.cost_per_diem)}</Box>
                    <Box as="td" p={2} textAlign="right">{formatNumber(breakdown.perDiemTotal)}</Box>
                  </Box>
                  <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                    <Box as="td" p={2}>{t('expenseReport.accommodation')}</Box>
                    <Box as="td" p={2} textAlign="right">{breakdown.accomDays} {t('expenseReport.nights')}</Box>
                    <Box as="td" p={2} textAlign="right">{formatNumber(mission.cost_accommodation)}</Box>
                    <Box as="td" p={2} textAlign="right">{formatNumber(breakdown.accomTotal)}</Box>
                  </Box>
                  <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                    <Box as="td" p={2}>{t('expenseReport.transport')}</Box>
                    <Box as="td" p={2} textAlign="right">—</Box>
                    <Box as="td" p={2} textAlign="right">—</Box>
                    <Box as="td" p={2} textAlign="right">{formatNumber(breakdown.transport)}</Box>
                  </Box>
                  <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                    <Box as="td" p={2}>{t('expenseReport.otherExpenses')}</Box>
                    <Box as="td" p={2} textAlign="right">—</Box>
                    <Box as="td" p={2} textAlign="right">—</Box>
                    <Box as="td" p={2} textAlign="right">{formatNumber(breakdown.other)}</Box>
                  </Box>
                  <Box as="tr" bg="blue.50">
                    <Box as="td" p={2} fontWeight="700" colSpan="3">{t('expenseReport.total')}</Box>
                    <Box as="td" p={2} fontWeight="700" textAlign="right" color="blue.600">{formatNumber(breakdown.total)} {cur}</Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Associations */}
          {(mission.project_detail || (mission.tasks_detail?.length) || (mission.milestones_detail?.length)) && (
            <>
              <Divider />
              <Box>
                <Heading size="xs" mb={2}><Icon as={FiLink} mr={1} />{t('missionDetail.associations')}</Heading>
                {mission.project_detail && (
                  <Text fontSize="sm"><Text as="span" fontWeight="600">{t('missionDetail.associatedProject')}:</Text> {mission.project_detail.name} — {mission.project_detail.progress || 0}%</Text>
                )}
                {mission.tasks_detail?.length > 0 && (
                  <Box mt={2}>
                    <Text fontWeight="600" fontSize="sm" mb={1}>{t('missionDetail.associatedTasks')}:</Text>
                    <VStack spacing={1} align="stretch">
                      {mission.tasks_detail.map(task => (
                        <Flex key={task.id} p={2} bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor} justify="space-between" align="center">
                          <Text fontSize="sm">{task.title}</Text>
                          <Badge colorScheme={task.status === 'completed' ? 'green' : 'blue'} fontSize="xs">{task.status}</Badge>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                )}
                {mission.milestones_detail?.length > 0 && (
                  <Box mt={2}>
                    <Text fontWeight="600" fontSize="sm" mb={1}>{t('missionDetail.associatedMilestones')}:</Text>
                    <VStack spacing={1} align="stretch">
                      {mission.milestones_detail.map(ms => (
                        <Flex key={ms.id} p={2} bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor} justify="space-between" align="center">
                          <HStack spacing={2}>
                            <Icon as={FiCalendar} />
                            <Text fontSize="sm">{ms.name}</Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">{formatDate(ms.due_date)} · {ms.progress || 0}%</Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                )}
              </Box>
            </>
          )}

          {/* Narrative report */}
          {mission.mission_report && (
            <>
              <Divider />
              <Box>
                <Heading size="xs" mb={2}><Icon as={FiFileText} mr={1} />{t('missionDetail.missionReportTitle')}</Heading>
                <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">{mission.mission_report}</Text>
              </Box>
            </>
          )}

          {mission.expense_report && (
            <>
              <Divider />
              <Box>
                <Heading size="xs" mb={2}>{t('missionReport.expenseNarrative')}</Heading>
                <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">{mission.expense_report}</Text>
              </Box>
            </>
          )}
        </VStack>
      </Box>
    </VStack>
  );
};

export default MissionReport;
