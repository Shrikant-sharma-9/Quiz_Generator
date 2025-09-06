import { UserProfile } from '../types';

const STORAGE_KEY = 'quizAiUserProfile';

export const saveUserProfile = (profile: UserProfile): void => {
    try {
        const serializedProfile = JSON.stringify(profile);
        localStorage.setItem(STORAGE_KEY, serializedProfile);
    } catch (error) {
        console.error("Could not save user profile to local storage:", error);
    }
};

export const loadUserProfile = (): UserProfile | null => {
    try {
        const serializedProfile = localStorage.getItem(STORAGE_KEY);
        if (serializedProfile === null) {
            return null;
        }
        return JSON.parse(serializedProfile);
    } catch (error) {
        console.error("Could not load user profile from local storage:", error);
        return null;
    }
};
