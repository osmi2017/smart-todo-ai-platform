import React, { useState, useEffect } from 'react';
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
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiChevronRight,
  FiChevronLeft,
  FiHelpCircle,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { isOnboardingActive } from '../utils/onboardingBus';

const PageGuide = ({ guideId, i18nPrefix, steps }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = `smarttodo_pageguide_${guideId}_v1`;

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey) === '1';
    } catch (e) {
      dismissed = false;
    }
    if (!dismissed && steps.length > 0 && !isOnboardingActive()) {
      setOpen(true);
    }
  }, [storageKey, steps]);

  const close = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch (e) {
      // ignore
    }
    setOpen(false);
  };

  const replay = () => {
    setStep(0);
    setOpen(true);
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      close();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const Card = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.18 }}
    >
      <Box
        w="min(400px, calc(100vw - 32px))"
        bg="white"
        borderRadius="2xl"
        boxShadow="0 20px 60px rgba(15,23,42,0.35)"
        overflow="hidden"
      >
        <Box bgGradient="linear(135deg, brand.500, accent.500)" px={5} py={4} color="white">
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              <Icon as={current?.icon} boxSize={5} />
              <Text fontWeight="700" fontSize="md">
                {t(`${i18nPrefix}.title`)}
              </Text>
            </HStack>
            <IconButton
              aria-label={t('pageGuide.skip')}
              icon={<FiX />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={close}
            />
          </HStack>
          <Progress
            value={((step + 1) / steps.length) * 100}
            size="xs"
            colorScheme="whiteAlpha"
            borderRadius="full"
            mt={3}
            bg="whiteAlpha.300"
          />
        </Box>
        <VStack align="stretch" spacing={2} px={5} py={4} minH="130px" justify="center">
          <Text fontWeight="700" fontSize="lg" color="gray.800">
            {t(`${i18nPrefix}.steps.${current?.key}.title`)}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {t(`${i18nPrefix}.steps.${current?.key}.description`)}
          </Text>
          <HStack justify="space-between" mt={3}>
            <HStack spacing={1.5}>
              {steps.map((s, i) => (
                <Box
                  key={s.key}
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={i === step ? 'brand.500' : 'gray.200'}
                  transition="all 0.2s"
                />
              ))}
            </HStack>
            <HStack spacing={2}>
              {step > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePrev}
                  leftIcon={<FiChevronLeft />}
                >
                  {t('pageGuide.previous')}
                </Button>
              )}
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleNext}
                rightIcon={isLast ? undefined : <FiChevronRight />}
              >
                {isLast ? t('pageGuide.gotIt') : t('pageGuide.next')}
              </Button>
            </HStack>
          </HStack>
        </VStack>
      </Box>
    </motion.div>
  );

  return (
    <>
      <Button
        position="fixed"
        bottom={4}
        right={4}
        zIndex={998}
        size="sm"
        variant="outline"
        colorScheme="brand"
        bg="white"
        boxShadow="md"
        leftIcon={<FiHelpCircle />}
        onClick={replay}
      >
        {t('pageGuide.guide')}
      </Button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key={`pageguide-${guideId}`}
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default PageGuide;
