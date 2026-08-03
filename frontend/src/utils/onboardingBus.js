export const ONBOARDING_EVENT = 'smarttodo:onboarding';
export const ONBOARDING_STORAGE_KEY = 'smarttodo_onboarding_done_v1';

let onboardingActive = false;

export const setOnboardingActive = (value) => {
  onboardingActive = value;
};

export const isOnboardingActive = () => onboardingActive;

export const launchOnboarding = () => {
  window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
};

export const markOnboardingDone = () => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch (e) {
    console.warn('localStorage unavailable', e);
  }
};

export const hasCompletedOnboarding = () => {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch (e) {
    return false;
  }
};
