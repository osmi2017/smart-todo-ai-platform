import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Icon,
  IconButton,
  Progress,
  useToken,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiChevronRight,
  FiChevronLeft,
  FiCpu,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {
  ONBOARDING_EVENT,
  ONBOARDING_STORAGE_KEY,
  markOnboardingDone,
  setOnboardingActive,
} from '../utils/onboardingBus';

const STEP_TARGETS = {
  welcome: null,
  sidebar: '[data-onboard="sidebar"]',
  quickcreate: '[data-onboard="quickcreate"]',
  help: '[data-onboard="help"]',
  done: null,
};

const OnboardingTour = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const rafRef = useRef(null);

  const brand600 = useToken('colors', 'brand.600');

  const stepIds = Object.keys(STEP_TARGETS);

  const computeTooltip = useCallback(() => {
    if (!active) return;
    const targetId = stepIds[step];
    const selector = STEP_TARGETS[targetId];
    const el = selector ? document.querySelector(selector) : null;

    if (!el) {
      setTargetRect(null);
      setTooltip(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardWidth = Math.min(360, vw - 32);
    const cardEstHeight = 210;
    const margin = 16;

    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    let pos;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = vw - rect.right;
    const spaceLeft = rect.left;

    if (spaceRight > cardWidth + 24 && rect.left < vw / 2) {
      pos = {
        top: Math.min(Math.max(rect.top + rect.height / 2 - 50, 12), vh - cardEstHeight - 12),
        left: rect.right + margin,
        width: cardWidth,
        arrow: 'left',
      };
    } else if (spaceBelow > cardEstHeight + margin * 2) {
      pos = {
        top: rect.bottom + margin,
        left: Math.min(Math.max(rect.left + rect.width / 2 - cardWidth / 2, 12), vw - cardWidth - 12),
        width: cardWidth,
        arrow: 'top',
      };
    } else if (spaceAbove > cardEstHeight + margin * 2) {
      pos = {
        top: Math.max(rect.top - cardEstHeight - margin, 12),
        left: Math.min(Math.max(rect.left + rect.width / 2 - cardWidth / 2, 12), vw - cardWidth - 12),
        width: cardWidth,
        arrow: 'bottom',
      };
    } else {
      pos = {
        top: rect.bottom + margin,
        left: Math.min(Math.max(rect.left, 12), vw - cardWidth - 12),
        width: cardWidth,
        arrow: 'top',
      };
    }
    setTooltip(pos);
  }, [active, step, stepIds]);

  useEffect(() => {
    if (active && step > 0) {
      const selector = STEP_TARGETS[stepIds[step]];
      if (selector) {
        const el = document.querySelector(selector);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      rafRef.current = requestAnimationFrame(computeTooltip);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, step, stepIds, computeTooltip]);

  useEffect(() => {
    return () => setOnboardingActive(false);
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const handleResize = () => computeTooltip();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [active, computeTooltip]);

  useEffect(() => {
    const onLaunch = () => {
      setStep(0);
      setOnboardingActive(true);
      setActive(true);
    };
    window.addEventListener(ONBOARDING_EVENT, onLaunch);
    return () => window.removeEventListener(ONBOARDING_EVENT, onLaunch);
  }, []);

  useEffect(() => {
    let done = false;
    try {
      done = localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
    } catch (e) {
      done = false;
    }
    if (done) return;
    setOnboardingActive(true);
    setActive(true);
  }, []);

  const close = () => {
    setActive(false);
    setOnboardingActive(false);
    setTargetRect(null);
    setTooltip(null);
  };

  const handleSkip = () => {
    markOnboardingDone();
    close();
  };

  const handleNext = () => {
    if (step === stepIds.length - 1) {
      markOnboardingDone();
      close();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const targetId = stepIds[step];
  const isSpotlight = STEP_TARGETS[targetId] !== null;
  const isFirst = step === 0;
  const isLast = step === stepIds.length - 1;

  const Card = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.18 }}
    >
      <Box
        w={tooltip ? tooltip.width : undefined}
        maxW="calc(100vw - 32px)"
        bg="white"
        borderRadius="2xl"
        boxShadow="0 20px 60px rgba(15,23,42,0.35)"
        overflow="hidden"
      >
        <Box bgGradient="linear(135deg, brand.500, accent.500)" px={5} py={4} color="white">
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              <Icon as={FiCpu} boxSize={5} />
              <Text fontWeight="700" fontSize="md">
                SmartTodoAI
              </Text>
            </HStack>
            <IconButton
              aria-label={t('onboarding.skip')}
              icon={<FiX />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={handleSkip}
            />
          </HStack>
          <Progress
            value={((step + 1) / stepIds.length) * 100}
            size="xs"
            colorScheme="whiteAlpha"
            borderRadius="full"
            mt={3}
            bg="whiteAlpha.300"
          />
        </Box>
        <VStack align="stretch" spacing={2} px={5} py={4}>
          <Text fontWeight="700" fontSize="lg" color="gray.800">
            {t(`onboarding.steps.${targetId}.title`)}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {t(`onboarding.steps.${targetId}.description`)}
          </Text>
          <HStack justify="space-between" mt={3}>
            <HStack spacing={1.5}>
              {stepIds.map((id, i) => (
                <Box
                  key={id}
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={i === step ? 'brand.500' : 'gray.200'}
                  transition="all 0.2s"
                />
              ))}
            </HStack>
            <HStack spacing={2}>
              {!isFirst && (
                <Button size="sm" variant="ghost" onClick={handlePrev} leftIcon={<FiChevronLeft />}>
                  {t('onboarding.previous')}
                </Button>
              )}
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleNext}
                rightIcon={isLast ? undefined : <FiChevronRight />}
              >
                {isLast ? t('onboarding.done') : t('onboarding.next')}
              </Button>
            </HStack>
          </HStack>
        </VStack>
      </Box>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          key="tour-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {isSpotlight && targetRect && (
            <motion.div
              key={`spotlight-${targetId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
                borderRadius: '14px',
                boxShadow: `0 0 0 9999px rgba(15,23,42,0.55), 0 0 0 3px ${brand600}`,
              }}
            />
          )}
          {!isSpotlight && (
            <Box
              position="absolute"
              inset={0}
              bg="rgba(15,23,42,0.55)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={4}
              pointerEvents="auto"
            >
              {Card}
            </Box>
          )}
          {isSpotlight && tooltip && (
            <Box
              position="fixed"
              style={{
                top: tooltip.top,
                left: tooltip.left,
                width: tooltip.width,
                pointerEvents: 'auto',
              }}
              zIndex={10000}
            >
              {Card}
            </Box>
          )}
          {isSpotlight && !tooltip && (
            <Box
              position="fixed"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              w="min(360px, calc(100vw - 32px))"
              pointerEvents="auto"
              zIndex={10000}
            >
              {Card}
            </Box>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default OnboardingTour;
